import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/schema.js';

const client = new Anthropic();

interface RewriteResult {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  score: number;
  author_persona: string;
  emoji_title: string;
}

const AUTHOR_PERSONAS = [
  { name: '科技小明', style: '理工科背景，擅长把复杂技术讲得通俗易懂，喜欢用类比和生活化例子' },
  { name: '投资笔记', style: '价值投资者，冷静理性，擅长数据分析，不贩卖焦虑' },
  { name: '生活观察', style: '细腻温暖，善于发现生活中的小确幸和有趣细节' },
  { name: '深度阅读', style: '知识广博，擅长跨领域联想，喜欢引用经典但不掉书袋' },
];

export async function rewriteArticle(articleId: number): Promise<RewriteResult> {
  const db = getDb();
  const article = db.prepare(
    'SELECT title, content, summary, link FROM articles WHERE id = ?'
  ).get(articleId) as { title: string; content: string; summary: string; link: string } | undefined;

  if (!article) {
    db.close();
    throw new Error('Article not found');
  }

  const rawText = article.content
    ? article.content.replace(/<[^>]+>/g, '').slice(0, 4000)
    : article.summary.slice(0, 4000);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `你是一个内容创作者。请把以下英文/中文技术文章改写成小绿书风格的中文帖子。

要求：
1. 标题要吸引人但不标题党，可以加emoji，控制在20字以内
2. 内容用中文改写，保留核心信息但更口语化、更有趣
3. 分段清晰，适合手机阅读，每段2-3句话
4. 用 emoji 适当装饰但不过度
5. 结尾可以加一句互动性的话
6. 根据内容选择最合适的作者人设
7. 评估内容质量1-10分（信息密度、原创性、实用性）
8. 如果原文就是贩卖焦虑/空洞无物的，质量分给低分（1-3分）

可选作者人设：
${AUTHOR_PERSONAS.map(p => `- ${p.name}：${p.style}`).join('\n')}

请返回如下 JSON（不要返回其他内容）：
{
  "title": "改写后的标题",
  "emoji_title": "带emoji的标题",
  "content": "改写后的正文（markdown格式，适合手机阅读）",
  "summary": "一句话摘要（20字以内）",
  "tags": ["标签1", "标签2"],
  "score": 8,
  "author_persona": "科技小明"
}

原文标题：${article.title}
原文内容：${rawText}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    db.close();
    throw new Error('AI response is not valid JSON');
  }

  const result: RewriteResult = JSON.parse(jsonMatch[0]);

  db.prepare(`
    UPDATE articles
    SET ai_score = ?,
        ai_tags = ?,
        ai_summary = ?,
        rewritten_title = ?,
        rewritten_content = ?,
        author_persona = ?
    WHERE id = ?
  `).run(
    result.score,
    JSON.stringify(result.tags),
    result.summary,
    result.emoji_title || result.title,
    result.content,
    result.author_persona,
    articleId
  );

  db.close();
  return result;
}

export async function rewriteUnprocessedArticles(limit = 10) {
  const db = getDb();
  const articles = db
    .prepare('SELECT id FROM articles WHERE rewritten_title IS NULL ORDER BY fetched_at DESC LIMIT ?')
    .all(limit) as { id: number }[];
  db.close();

  const results = [];
  for (const article of articles) {
    try {
      const result = await rewriteArticle(article.id);
      results.push({ id: article.id, ...result });
    } catch (err) {
      results.push({ id: article.id, error: (err as Error).message });
    }
  }
  return results;
}
