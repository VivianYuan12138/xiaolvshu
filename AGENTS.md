# 小绿书 - AI Agent 指南

## 项目简介
小绿书是一个内容聚合应用：从多平台 RSS 抓取内容 → AI 评分过滤垃圾 → AI 改写成中文社交风格帖子 → 手机端展示。

## 架构
```
RSS 信息源(18个) → 抓取(并发5) → AI评分(1-10) → 过滤(≥5分) → AI改写(4种人设) → Express API → React 前端
```

## 技术栈
- **后端**: TypeScript, Express, SQLite (better-sqlite3), OpenAI SDK (兼容多provider)
- **前端**: React 19, Tailwind CSS 4, Vite
- **AI Provider**: DeepSeek (默认), 也支持 Gemini/Qwen/OpenAI

## 目录结构
```
server/
  src/
    services/      → AI pipeline 核心（详见 services/AGENTS.md）
    db/            → SQLite schema + 种子数据
    routes/        → Express API (articles, feeds)
    prompts/       → 评分和改写的 prompt 模板（版本化管理）
  run-rewrite.ts   → 完整 pipeline 入口
  scripts/         → 拆分的调试命令（fetch-only, score-only, stats 等）
client/
  src/
    components/    → React 组件（详见 client/AGENTS.md）
    api.ts         → 唯一的 HTTP 接口层
```

## 全局约束
1. **所有 AI 调用必须走 `ai-client.ts`**，不要在其他地方直接 `new OpenAI()`
2. **SQLite 是唯一数据存储**，`getDb()` 获取连接，用完必须 `db.close()`
3. **前端所有 API 调用走 `api.ts`**，组件内不要直接 `fetch`
4. **UI 语言必须是中文**
5. **不要引入新的运行时依赖**除非有充分理由

## 常用命令
```bash
# 启动开发
cd server && npm run dev     # 后端 :3001
cd client && npm run dev     # 前端 :5173

# 完整 pipeline
cd server && npx tsx run-rewrite.ts

# 拆分调试（不用跑完整 pipeline）
cd server && npx tsx scripts/fetch-only.ts    # 只抓取
cd server && npx tsx scripts/score-only.ts    # 只评分
cd server && npx tsx scripts/rewrite-only.ts  # 只改写
cd server && npx tsx scripts/stats.ts         # 看数据统计
cd server && npx tsx scripts/show-articles.ts # 看文章内容质量
```

## 环境变量 (.env)
```
AI_PROVIDER=deepseek          # gemini | deepseek | qwen | openai
DEEPSEEK_API_KEY=sk-xxx       # 对应 provider 的 key
```
