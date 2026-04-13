/**
 * Prompt 统一导出
 * 所有 prompt 相关的常量、接口、模板都从这里 import
 */

export {
  // 评分
  SCORING_SYSTEM_PROMPT_V1,
  SCORING_TEMPERATURE,
  SCORING_MAX_TOKENS,
  MIN_CONTENT_LENGTH,
  type ScoreResult,
} from './scoring.js';

export {
  // 改写
  REWRITE_SYSTEM_PROMPT_V1,
  REWRITE_TEMPERATURE,
  REWRITE_MAX_TOKENS,
  FEW_SHOT_EXAMPLES_V1,
  AUTHOR_PERSONAS,
  MIN_SCORE_TO_REWRITE,
  MIN_CONTENT_TO_REWRITE,
  MAX_CONTENT_LENGTH,
  type RewriteResult,
} from './rewriting.js';
