import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { chatCompletionStream, type ChatMessage } from '../services/ai-client.js';
import { buildChatSystemPrompt, CHAT_TEMPERATURE, CHAT_MAX_TOKENS } from '../prompts/index.js';

const router = Router();

interface CommentRow {
  id: number;
  article_id: number;
  role: string;
  content: string;
  parent_id: number | null;
  created_at: string;
}

// GET /api/articles/:id/comments — 获取文章评论
router.get('/:id/comments', (req, res) => {
  const db = getDb();
  const comments = db.prepare(
    'SELECT * FROM comments WHERE article_id = ? ORDER BY created_at ASC',
  ).all(req.params.id) as CommentRow[];
  db.close();
  res.json(comments);
});

// POST /api/articles/:id/comments — 发评论，AI 自动回复（SSE 流式）
router.post('/:id/comments', async (req, res) => {
  const { content, parent_id } = req.body as { content: string; parent_id?: number };

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: '评论不能为空' });
    return;
  }
  if (content.length > 500) {
    res.status(400).json({ error: '评论太长，请控制在500字以内' });
    return;
  }

  const articleId = Number(req.params.id);

  const db = getDb();
  const article = db.prepare(`
    SELECT title, rewritten_title, rewritten_content, content, summary,
           ai_summary, author_persona
    FROM articles WHERE id = ?
  `).get(articleId) as {
    title: string;
    rewritten_title: string | null;
    rewritten_content: string | null;
    content: string | null;
    summary: string | null;
    ai_summary: string | null;
    author_persona: string | null;
  } | undefined;

  if (!article) {
    db.close();
    res.status(404).json({ error: '文章不存在' });
    return;
  }

  // 保存用户评论
  const userComment = db.prepare(
    'INSERT INTO comments (article_id, role, content, parent_id) VALUES (?, ?, ?, ?)',
  ).run(articleId, 'user', content.trim(), parent_id ?? null);
  const userCommentId = userComment.lastInsertRowid as number;

  // 获取历史评论作为上下文
  const history = db.prepare(
    'SELECT role, content FROM comments WHERE article_id = ? ORDER BY created_at ASC',
  ).all(articleId) as { role: string; content: string }[];
  db.close();

  const personaName = article.author_persona || '小绿书';
  const articleTitle = article.rewritten_title || article.title;
  const articleSummary = article.ai_summary || article.summary || '';
  const articleContent = article.rewritten_content || article.content || '';

  const systemPrompt = buildChatSystemPrompt(
    personaName, articleTitle, articleSummary, articleContent,
  );

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-20).map(h => ({
      role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: h.content,
    })),
  ];

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // 先发送用户评论 ID
  res.write(`data: ${JSON.stringify({ userCommentId })}\n\n`);

  let fullReply = '';

  try {
    const stream = chatCompletionStream(messages, {
      temperature: CHAT_TEMPERATURE,
      maxTokens: CHAT_MAX_TOKENS,
    });

    for await (const delta of stream) {
      fullReply += delta;
      res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
    }

    // 保存 AI 回复到数据库
    const db2 = getDb();
    const aiComment = db2.prepare(
      'INSERT INTO comments (article_id, role, content, parent_id) VALUES (?, ?, ?, ?)',
    ).run(articleId, 'author', fullReply, userCommentId);
    db2.close();

    res.write(`data: ${JSON.stringify({ done: true, aiCommentId: aiComment.lastInsertRowid })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Comment reply error:', err.message);
    if (fullReply) {
      const db2 = getDb();
      db2.prepare(
        'INSERT INTO comments (article_id, role, content, parent_id) VALUES (?, ?, ?, ?)',
      ).run(articleId, 'author', fullReply, userCommentId);
      db2.close();
    }
    res.write(`data: ${JSON.stringify({ error: '回复生成失败，请稍后重试' })}\n\n`);
    res.end();
  }
});

export default router;
