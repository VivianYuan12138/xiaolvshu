# Services - AI Pipeline 指南

## 文件职责
| 文件 | 职责 | 改动风险 |
|------|------|----------|
| `ai-client.ts` | 唯一的 LLM 接口层，所有 provider 的适配 | 高 - 改坏影响全部 AI 功能 |
| `ai.ts` | 文章评分，调用评分 prompt | 中 - prompt 在 `prompts/` 目录 |
| `author-agent.ts` | 文章改写，调用改写 prompt + few-shot | 中 - prompt 在 `prompts/` 目录 |
| `rss.ts` | RSS 抓取 + 图片提取 | 低 - 独立模块 |

## 推荐反馈系统

### 评分双分制
- **Quality Score (ai_score)**: 客观质量分，不随用户行为变化，是硬性护栏
- **Relevance Score (ai_relevance)**: 基于用户收藏偏好的相关度，动态注入 prompt
- 最终排序: `ai_score * COALESCE(ai_relevance, 5) / 10.0 DESC`
- 无收藏时 relevance 默认 5（中性），评分 prompt 退回 V1 版（行为不变）

### 内容发现 (`discovery.ts`)
- 从收藏提取关键词 → Google News RSS → 注册为 `is_dynamic=1` 的 feed
- 动态 feed 7 天过期自动清理（有收藏文章的 feed 保留）
- 收藏不足 3 篇时跳过发现
- 集成在 pipeline Step 0，先于 fetchAllFeeds 执行

### 收藏
- 前端通过 `POST /api/articles/:id/favorite` 同步到后端
- 存储: `articles.is_favorited` + `articles.favorited_at`
- `getUserPreferences()` 在 ai.ts 中读取收藏，提取标签频率 + 标题

## 关键规则

### AI Client (`ai-client.ts`)
- 支持 gemini/deepseek/qwen/openai 四个 provider，全部用 OpenAI 兼容格式
- 新增 provider：只需在 `PROVIDER_CONFIGS` 添加配置
- 内置重试：429 错误自动指数退避（2s→4s→8s）
- **绝对不要在其他文件直接 `new OpenAI()`**

### 评分 (`ai.ts`)
- 温度 **0.2**（确定性评估），不要调高
- 内容 <100 字自动给 2 分，省 API 费用
- 评分标准 5 维：信息密度(最高权重) > 原创性 > 实用性 > 反焦虑 > 反标题党
- **修改评分标准请改 `prompts/scoring.ts`，不要改 `ai.ts`**

### 改写 (`author-agent.ts`)
- 温度 **0.6**（创造但可控）
- 只改写 ai_score ≥ 5 的文章
- 内容 <80 字跳过改写
- 4 个作者人设：科技小明/投资笔记/生活观察/深度阅读
- 2 个 few-shot 示例是承重结构，修改需匹配 JSON schema
- **修改改写规则请改 `prompts/rewriting.ts`，不要改 `author-agent.ts`**

### RSS 抓取 (`rss.ts`)
- Reddit 需要浏览器 User-Agent（否则 403）
- 图片提取 4 级策略：media:content → enclosure → img 标签 → OG image
- OG image 是异步后台抓取（不阻塞主流程）
- 并发抓取默认 5 个 worker

## 数据库模式
- `articles.link` 是 UNIQUE，这是去重机制，不能删
- `getDb()` / `db.close()` 必须配对使用（SQLite 不用连接池）
- 新增列用 `ALTER TABLE ADD COLUMN`，必须有默认值或 nullable
