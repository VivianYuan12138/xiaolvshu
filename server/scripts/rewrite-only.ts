/**
 * AI 改写
 * 用法:
 *   npx tsx scripts/rewrite-only.ts          # 默认改 10 篇（debug 快速验证）
 *   npx tsx scripts/rewrite-only.ts -n 30    # 改 30 篇
 *   npx tsx scripts/rewrite-only.ts --all    # 改所有待改写文章
 */
import 'dotenv/config';
import { initDb } from '../src/db/schema.js';
import { rewriteUnprocessedArticles } from '../src/services/author-agent.js';

initDb();

const args = process.argv.slice(2);
const all = args.includes('--all');
const limit = args.includes('-n')
  ? parseInt(args[args.indexOf('-n') + 1]) || 10
  : all ? 9999 : 10;

async function main() {
  const start = Date.now();
  console.log(`\n========== AI 改写 ${all ? '(全量)' : `(${limit}篇)`} ==========`);
  const results = await rewriteUnprocessedArticles(limit);
  const ok = results.filter(r => !('error' in r)).length;
  const sec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ 完成，${ok}/${results.length} 篇，耗时 ${sec}s。用 show-articles.ts 查看质量\n`);
}

main().catch(console.error);
