/**
 * 查看文章内容质量 —— 展示改写后的文章，方便肉眼检查
 * 用法:
 *   npx tsx scripts/show-articles.ts           # 显示最新10篇改写文章
 *   npx tsx scripts/show-articles.ts --top     # 显示评分最高的10篇
 *   npx tsx scripts/show-articles.ts --bad     # 显示低分文章（检查评分是否合理）
 *   npx tsx scripts/show-articles.ts --raw     # 显示未改写的原始内容
 *   npx tsx scripts/show-articles.ts -n 5      # 只显示5篇
 */
import 'dotenv/config';
import { initDb, getDb } from '../src/db/schema.js';

initDb();
const db = getDb();

const args = process.argv.slice(2);
const count = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1]) || 10 : 10;
const mode = args.includes('--top') ? 'top'
  : args.includes('--bad') ? 'bad'
  : args.includes('--raw') ? 'raw'
  : 'latest';

let query: string;
let title: string;

switch (mode) {
  case 'top':
    title = `⭐ 评分最高的 ${count} 篇`;
    query = `SELECT * FROM articles WHERE rewritten_title IS NOT NULL ORDER BY ai_score DESC LIMIT ${count}`;
    break;
  case 'bad':
    title = `❌ 低分文章 (检查评分是否合理)`;
    query = `SELECT * FROM articles WHERE ai_score IS NOT NULL AND ai_score <= 3 ORDER BY ai_score ASC LIMIT ${count}`;
    break;
  case 'raw':
    title = `📄 未改写的原始内容 (≥5分)`;
    query = `SELECT * FROM articles WHERE rewritten_title IS NULL AND ai_score >= 5 ORDER BY ai_score DESC LIMIT ${count}`;
    break;
  default:
    title = `📝 最新改写的 ${count} 篇`;
    query = `SELECT * FROM articles WHERE rewritten_title IS NOT NULL ORDER BY rowid DESC LIMIT ${count}`;
}

const articles = db.prepare(query).all() as any[];
db.close();

console.log(`\n${title}`);
console.log('='.repeat(60));

if (articles.length === 0) {
  console.log('\n  没有符合条件的文章\n');
  process.exit(0);
}

for (const a of articles) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📌 [${a.ai_score || '?'}分] ${a.rewritten_title || a.title}`);

  if (a.author_persona) console.log(`👤 ${a.author_persona}`);
  if (a.ai_summary) console.log(`💡 ${a.ai_summary}`);

  if (a.ai_tags) {
    try {
      const tags = JSON.parse(a.ai_tags);
      if (tags.length) console.log(`🏷️  ${tags.join(' · ')}`);
    } catch {}
  }

  // 显示内容
  const content = a.rewritten_content || a.content || a.summary || '';
  const cleanContent = content.replace(/<[^>]+>/g, '').trim();
  if (cleanContent) {
    console.log('');
    // 限制显示长度，避免刷屏
    const lines = cleanContent.split('\n').slice(0, 20);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    if (cleanContent.split('\n').length > 20) {
      console.log(`  ... (还有 ${cleanContent.split('\n').length - 20} 行)`);
    }
  }

  console.log(`\n  🔗 ${a.link}`);
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`共 ${articles.length} 篇\n`);
