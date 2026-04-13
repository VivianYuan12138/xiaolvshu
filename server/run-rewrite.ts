import 'dotenv/config';
import { initDb } from './src/db/schema.js';
import { rewriteUnprocessedArticles } from './src/services/author-agent.js';

initDb();

async function main() {
  const batchSize = 20;
  let round = 1;
  let total = 0;

  while (true) {
    console.log(`\n🤖 第${round}轮改写（${batchSize}篇）...`);
    const results = await rewriteUnprocessedArticles(batchSize);
    if (results.length === 0) {
      console.log('✅ 全部改写完成！');
      break;
    }
    const ok = results.filter(r => !('error' in r)).length;
    total += ok;
    for (const r of results) {
      if ('error' in r) {
        console.log('  ❌', r.id, (r.error as string)?.slice(0, 80));
      } else {
        console.log('  ✅', r.emoji_title || r.title);
      }
    }
    console.log(`本轮: ${ok}/${results.length}，累计: ${total}`);
    round++;
  }
}

main();
