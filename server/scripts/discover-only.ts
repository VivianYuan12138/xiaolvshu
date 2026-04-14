import 'dotenv/config';
import { initDb } from '../src/db/schema.js';
import { discoverContent } from '../src/services/discovery.js';

initDb();

async function main() {
  console.log('\n========== 内容发现 ==========');
  const result = await discoverContent();
  console.log(`\n✅ 完成: ${result.keywords.length} 关键词, ${result.feeds} 新源, ${result.articles} 新文章\n`);
}

main().catch(console.error);
