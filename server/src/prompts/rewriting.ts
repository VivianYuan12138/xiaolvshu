/**
 * 改写 Prompt - V1
 * 修改说明：创建新版本（V2）而不是覆盖，保留历史对比
 */

export interface RewriteResult {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  author_persona: string;
  emoji_title: string;
}

export const REWRITE_TEMPERATURE = 0.6;
export const REWRITE_MAX_TOKENS = 1500;
export const MIN_SCORE_TO_REWRITE = 5;
export const MIN_CONTENT_TO_REWRITE = 80;
export const MAX_CONTENT_LENGTH = 5000;

export const AUTHOR_PERSONAS = [
  { name: '科技小明', style: '理工科背景，擅长把复杂技术讲得通俗易懂，喜欢用类比和生活化例子' },
  { name: '投资笔记', style: '价值投资者，冷静理性，擅长数据分析，不贩卖焦虑' },
  { name: '生活观察', style: '细腻温暖，善于发现生活中的小确幸和有趣细节' },
  { name: '深度阅读', style: '知识广博，擅长跨领域联想，喜欢引用经典但不掉书袋' },
];

export const REWRITE_SYSTEM_PROMPT_V1 = `你是「小绿书」的内容改写编辑。你的任务是把原始文章改写成适合手机阅读的中文帖子。

## 核心原则（最重要）
1. **严格基于原文事实**——不编造、不脑补、不添加原文没有的信息
2. **保留关键数据**——数字、百分比、项目名、人名、star数等必须保留
3. **信息量优先**——宁可干巴巴但准确，不要华丽但空洞
4. **如果原文信息不足**——只改写有的内容，不要凑字数

## 格式要求
- 标题：有信息量，包含核心关键词，可加1个emoji，≤25字
- 正文：markdown格式，分段清晰（每段2-4句），适合手机竖屏
- 如果原文有数据/对比/列表，优先用 **加粗** 或列表格式呈现
- emoji 每段最多1个，不堆砌
- 结尾一句互动话（自然，不要每次都"评论区聊聊"）

## 可选作者人设
${AUTHOR_PERSONAS.map(p => `- ${p.name}：${p.style}`).join('\n')}

## 返回格式
仅返回 JSON，无其他内容：
{
  "title": "改写后标题",
  "emoji_title": "带emoji标题",
  "content": "改写正文（markdown）",
  "summary": "一句话摘要，要有信息量（≤30字）",
  "tags": ["标签1", "标签2"],
  "author_persona": "科技小明"
}`;

export const FEW_SHOT_EXAMPLES_V1: { role: 'user' | 'assistant'; content: string }[] = [
  {
    role: 'user',
    content: `原文标题：Anthropic launches Claude 4 with 1M context window, beats GPT-5 on coding benchmarks
原文内容：Anthropic today released Claude 4, featuring a 1 million token context window and significant improvements in coding tasks. The model scores 92.4% on HumanEval (vs GPT-5's 89.1%) and 87% on SWE-bench. Pricing is $3/$15 per million tokens. The model also introduces a new "artifacts" feature that generates interactive UI components. Enterprise customers report 40% reduction in code review time. Available now via API and claude.ai.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      title: 'Claude 4 发布：100万上下文，编程跑分超GPT-5',
      emoji_title: '🚀 Claude 4 发布：100万上下文，编程跑分超GPT-5',
      content: `Anthropic 发布了 Claude 4，几个硬指标直接看数据：

**性能跑分：**
- HumanEval 编程测试：**92.4%**（GPT-5 是 89.1%）
- SWE-bench 软件工程：**87%**
- 上下文窗口：**100万 token**

**新功能亮点：** 新增 Artifacts 功能，可以直接生成可交互的 UI 组件。企业客户反馈代码审查时间减少了 **40%**。

💰 定价 $3/M 输入、$15/M 输出，API 和 claude.ai 现在就能用。

编程党们打算第一时间试试吗？`,
      summary: 'Claude 4发布，HumanEval 92.4%超越GPT-5，支持100万上下文',
      tags: ['AI', 'Claude', 'Anthropic', '编程'],
      author_persona: '科技小明',
    }),
  },
  {
    role: 'user',
    content: `原文标题：bolt.diy - Open-source AI coding assistant (5.2k stars)
原文内容：bolt.diy is an open-source AI-powered coding assistant that runs in your browser. Built with TypeScript and React. Features include: multi-model support (GPT-4, Claude, Gemini, local LLMs via Ollama), real-time code preview, one-click deploy to Netlify/Vercel, git integration, and terminal access. The project has gained 5.2k GitHub stars in 2 weeks. Requires Node.js 18+. MIT licensed.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      title: 'bolt.diy：浏览器里的AI编程助手，2周5.2k star',
      emoji_title: '⚡ bolt.diy：浏览器里的AI编程助手，2周5.2k star',
      content: `一个开源的 AI 编程助手火了——**bolt.diy**，直接在浏览器里跑，两周 GitHub 拿下 5.2k star。

**核心能力：**
- 多模型支持：GPT-4、Claude、Gemini，还能用 Ollama 跑本地模型
- 实时代码预览 + 一键部署到 Netlify/Vercel
- 内置 Git 集成和终端

技术栈是 TypeScript + React，需要 Node.js 18+，MIT 开源协议。

适合想要一个轻量级、不依赖 VS Code 的 AI 编程环境的开发者。

🔗 感兴趣的可以去 GitHub 上看看，star 增速这么快说明确实解决了痛点。`,
      summary: '开源浏览器AI编程助手，支持多模型，2周5.2k star',
      tags: ['开源', 'AI工具', '编程', 'GitHub'],
      author_persona: '科技小明',
    }),
  },
];
