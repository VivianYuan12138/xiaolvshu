import { chatCompletion, parseJSON, getRewriteModel } from './ai-client.js';
import { getDb } from '../db/schema.js';

interface RewriteResult {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  author_persona: string;
  emoji_title: string;
}

const AUTHOR_PERSONAS = [
  { name: '科技小明', style: '理工科背景，擅长把复杂技术讲得通俗易懂，喜欢用类比和生活化例子' },
  { name: '投资笔记', style: '价值投资者，冷静理性，擅长数据分析，不贩卖焦虑' },
  { name: '生活观察', style: '细腻温暖，善于发现生活中的小确幸和有趣细节' },
  { name: '深度阅读', style: '知识广博，擅长跨领域联想，喜欢引用经典但不掉书袋' },
];

const SYSTEM_PROMPT = `你是「小绿书」的内容创作者。你的任务是把原始文章改写成适合手机阅读的中文帖子。

## 写作风格要求
- 标题：吸引人但不标题党，可加 emoji，控制在 20 字以内
- 正文：中文改写，保留核心信息，口语化、有趣
- 分段清晰，每段 2-3 句话，适合手机竖屏阅读
- emoji 适当点缀（每段 0-2 个），不要堆砌
- 结尾加一句互动性的话（提问/邀请讨论）
- 根据内容选择最合适的作者人设

## 可选作者人设
${AUTHOR_PERSONAS.map(p => `- ${p.name}：${p.style}`).join('\n')}

## 返回格式
仅返回 JSON，无其他内容：
{
  "title": "改写后的标题",
  "emoji_title": "带emoji的标题",
  "content": "改写后的正文（markdown格式）",
  "summary": "一句话摘要（20字以内）",
  "tags": ["标签1", "标签2"],
  "author_persona": "科技小明"
}`;

// Few-shot examples to guide quality
const FEW_SHOT_EXAMPLES: { role: 'user' | 'assistant'; content: string }[] = [
  {
    role: 'user',
    content: `原文标题：OpenAI announces GPT-5 with improved reasoning capabilities
原文内容：OpenAI has released GPT-5, featuring significant improvements in reasoning, math, and coding. The model achieves 90% on GPQA Diamond benchmark. It also introduces a new "thinking" mode that shows chain-of-thought reasoning. Pricing starts at $5 per million input tokens. Early users report 30-40% improvement in complex task completion compared to GPT-4o.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      title: 'GPT-5来了，推理能力暴涨40%',
      emoji_title: '🚀 GPT-5来了，推理能力暴涨40%',
      content: `OpenAI 刚发布了 GPT-5，这次升级真的有料 👀

**三个核心提升：**
- 推理能力大幅增强，GPQA 基准测试拿到 90 分
- 新增「思考模式」，能看到 AI 的推理过程
- 数学和编程能力同步提升

实测下来，处理复杂任务比 GPT-4o 好了 30-40%，这个提升幅度还是很明显的。

💰 价格方面，输入 $5/百万 token，比上一代贵了一些，但能力提升对得起价格。

你会第一时间升级试试吗？评论区聊聊最想用它做什么 ⬇️`,
      summary: 'GPT-5发布，推理能力大幅提升',
      tags: ['AI', 'OpenAI', 'GPT-5'],
      author_persona: '科技小明',
    }),
  },
  {
    role: 'user',
    content: `原文标题：为什么你应该停止喝咖啡——你的身体正在被毁掉
原文内容：每天喝咖啡的你，知道自己在慢性自杀吗？咖啡因会导致焦虑、失眠、心悸，长期饮用更是会让你的肾上腺疲劳。很多人以为咖啡提神，但其实你只是在透支生命力。立刻停止喝咖啡，你的身体会感谢你。`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      title: '咖啡到底该不该喝？理性聊聊',
      emoji_title: '☕ 咖啡到底该不该喝？理性聊聊',
      content: `最近看到一些「咖啡有害」的文章，说得挺吓人的。但冷静看看科学怎么说 🧐

**先说结论：适量咖啡对多数人是安全的。**

每天 2-3 杯（约 400mg 咖啡因以内），大量研究表明不仅无害，还可能降低二型糖尿病和帕金森风险。

⚠️ 但这几类人确实要注意：
- 容易焦虑或失眠的朋友，下午就别喝了
- 孕期建议控制在 200mg 以内
- 有心律不齐的，遵医嘱

关键不是「喝不喝」，而是「怎么喝」。抛开剂量谈毒性，都是耍流氓。

你每天喝几杯咖啡？有没有感觉到什么变化？`,
      summary: '理性看待咖啡，适量饮用无害',
      tags: ['健康', '咖啡', '辟谣'],
      author_persona: '生活观察',
    }),
  },
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

  const text = await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      ...FEW_SHOT_EXAMPLES,
      {
        role: 'user',
        content: `原文标题：${article.title}\n原文内容：${rawText}`,
      },
    ],
    { model: getRewriteModel(), maxTokens: 1500, temperature: 0.7 }
  );

  const result = parseJSON<RewriteResult>(text);

  db.prepare(`
    UPDATE articles
    SET ai_tags = ?,
        ai_summary = ?,
        rewritten_title = ?,
        rewritten_content = ?,
        author_persona = ?
    WHERE id = ?
  `).run(
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
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    try {
      const result = await rewriteArticle(article.id);
      results.push({ id: article.id, ...result });
    } catch (err) {
      results.push({ id: article.id, error: (err as Error).message });
    }
    // Rate limit: wait between requests to avoid 429
    if (i < articles.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return results;
}
