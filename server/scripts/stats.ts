/**
 * 快速查看数据统计 —— 不调用 API，纯数据库查询，秒出结果
 * 用法: npx tsx scripts/stats.ts
 */
import 'dotenv/config';
import { initDb, getDb } from '../src/db/schema.js';

initDb();
const db = getDb();

// 总览
const overview = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN ai_score IS NOT NULL THEN 1 ELSE 0 END) as scored,
    SUM(CASE WHEN ai_score IS NULL THEN 1 ELSE 0 END) as unscored,
    SUM(CASE WHEN ai_score >= 5 THEN 1 ELSE 0 END) as good,
    SUM(CASE WHEN ai_score >= 7 THEN 1 ELSE 0 END) as excellent,
    SUM(CASE WHEN rewritten_title IS NOT NULL THEN 1 ELSE 0 END) as rewritten,
    SUM(CASE WHEN rewritten_title IS NULL AND ai_score >= 5 THEN 1 ELSE 0 END) as pending_rewrite,
    SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) as with_image,
    ROUND(AVG(CASE WHEN ai_score IS NOT NULL THEN ai_score END), 1) as avg_score
  FROM articles
`).get() as any;

console.log('\n📊 ===== 数据总览 =====');
console.log(`  文章总数:   ${overview.total}`);
console.log(`  已评分:     ${overview.scored}  (未评分: ${overview.unscored})`);
console.log(`  平均分:     ${overview.avg_score || '-'}`);
console.log(`  优质(≥5):   ${overview.good}`);
console.log(`  精品(≥7):   ${overview.excellent}`);
console.log(`  已改写:     ${overview.rewritten}  (待改写: ${overview.pending_rewrite})`);
console.log(`  有封面图:   ${overview.with_image}`);

// 按分数分布
const scoreDist = db.prepare(`
  SELECT
    CASE
      WHEN ai_score >= 8 THEN '8-10 ⭐'
      WHEN ai_score >= 6 THEN '6-7  ✅'
      WHEN ai_score >= 4 THEN '4-5  🔸'
      WHEN ai_score >= 1 THEN '1-3  ❌'
      ELSE '未评分'
    END as range,
    COUNT(*) as count
  FROM articles
  GROUP BY range
  ORDER BY range DESC
`).all() as any[];

console.log('\n📈 ===== 分数分布 =====');
for (const row of scoreDist) {
  const bar = '█'.repeat(Math.min(Math.round(row.count / 2), 40));
  console.log(`  ${row.range}  ${bar} ${row.count}`);
}

// 按信息源统计
const feedStats = db.prepare(`
  SELECT
    f.title as feed,
    COUNT(a.id) as total,
    ROUND(AVG(a.ai_score), 1) as avg_score,
    SUM(CASE WHEN a.ai_score >= 5 THEN 1 ELSE 0 END) as good,
    SUM(CASE WHEN a.rewritten_title IS NOT NULL THEN 1 ELSE 0 END) as rewritten
  FROM feeds f
  LEFT JOIN articles a ON a.feed_id = f.id
  GROUP BY f.id
  ORDER BY avg_score DESC
`).all() as any[];

console.log('\n📡 ===== 信息源质量 =====');
console.log('  源名称                      | 文章 | 均分 | 优质 | 已改写');
console.log('  ' + '-'.repeat(70));
for (const row of feedStats) {
  const name = (row.feed || '').padEnd(26);
  console.log(`  ${name} | ${String(row.total).padStart(4)} | ${String(row.avg_score || '-').padStart(4)} | ${String(row.good || 0).padStart(4)} | ${String(row.rewritten || 0).padStart(4)}`);
}

// 按标签统计
const tagStats = db.prepare(`
  SELECT ai_tags FROM articles WHERE ai_tags IS NOT NULL AND ai_tags != '[]'
`).all() as { ai_tags: string }[];

const tagCounts: Record<string, number> = {};
for (const row of tagStats) {
  try {
    const tags = JSON.parse(row.ai_tags) as string[];
    for (const tag of tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  } catch {}
}
const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

if (topTags.length > 0) {
  console.log('\n🏷️  ===== 热门标签 Top 15 =====');
  for (const [tag, count] of topTags) {
    const bar = '▓'.repeat(Math.min(Math.round(count / 2), 30));
    console.log(`  ${tag.padEnd(15)} ${bar} ${count}`);
  }
}

db.close();
console.log('\n');
