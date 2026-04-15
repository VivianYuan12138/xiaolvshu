/**
 * 评分 Prompt - V1
 * 修改说明：创建新版本（V2）而不是覆盖，保留历史对比
 */

export interface ScoreResult {
  score: number;
  tags: string[];
  summary: string;
  reason: string;
}

export const SCORING_TEMPERATURE = 0.2;
export const SCORING_MAX_TOKENS = 300;
export const MIN_CONTENT_LENGTH = 100;

export const SCORING_SYSTEM_PROMPT_V1 = `你是内容质量评估员。严格评估文章质量，返回 JSON。

评分标准（1-10分）：
- 信息密度（权重最高）：是否有具体的数据、事实、案例？纯观点无论据扣分
- 原创性：是否有独特见解或一手信息？复制粘贴/AI水文给低分
- 实用性：读完是否能学到具体东西？
- 焦虑指数（反向）：贩卖焦虑 → 大幅扣分
- 标题党程度（反向）：标题夸大其词 → 扣分

特别注意：
- 只有标题没有实质正文 → 1-2分
- 纯营销/广告软文 → 1-3分
- 有数据有案例的深度内容 → 7-10分
- GitHub 项目介绍如果有star数、功能描述 → 5-8分

返回格式（仅JSON）：
{"score": 7, "tags": ["AI", "开源"], "summary": "一句话核心内容（要有信息量，不是复述标题）", "reason": "评分理由"}`;

export interface UserPreferences {
  topTags: string[];
  recentTitles: string[];
}

export function buildScoringPrompt(preferences?: UserPreferences): string {
  if (!preferences || (preferences.topTags.length === 0 && preferences.recentTitles.length === 0)) {
    return SCORING_SYSTEM_PROMPT_V1;
  }

  return SCORING_SYSTEM_PROMPT_V1 + `

## 用户偏好评估（额外维度）
用户最近收藏的内容主题：${preferences.topTags.slice(0, 8).join('、')}
用户收藏标题示例：
${preferences.recentTitles.slice(0, 5).map(t => `- ${t}`).join('\n')}

在保持质量评分(score)不变的基础上，额外评估"与用户兴趣的相关度"(relevance)。
相关度评分标准（1-10分）：
- 主题完全匹配用户兴趣标签 → 8-10
- 部分相关或相似领域 → 5-7
- 完全不相关但高质量 → 3-5（不惩罚高质量内容）

返回格式（仅JSON）：
{"score": 7, "relevance": 8, "tags": ["AI", "开源"], "summary": "一句话核心内容", "reason": "评分理由"}`;
}
