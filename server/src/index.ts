import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/schema.js';
import { seedFeeds } from './db/seeds.js';
import feedsRouter from './routes/feeds.js';
import articlesRouter from './routes/articles.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 确保数据目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据库 & 种子数据
initDb();
seedFeeds();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/feeds', feedsRouter);
app.use('/api/articles', articlesRouter);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: '小绿书' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌿 小绿书后端运行中: http://localhost:${PORT}`);
});
