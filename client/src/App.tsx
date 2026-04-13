import { useState, useEffect, useCallback } from 'react';
import { fetchArticles, fetchTags, markRead, type Article, type Tag } from './api';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetail } from './components/ArticleDetail';
import { TagFilter } from './components/TagFilter';
import { FeedManager } from './components/FeedManager';
import { DailyComplete } from './components/DailyComplete';

const DAILY_LIMIT = 30;

function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showFeeds, setShowFeeds] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [articleData, tagData] = await Promise.all([
      fetchArticles(6, selectedTag ?? undefined),
      fetchTags(),
    ]);
    setArticles(articleData.articles);
    setTags(tagData);
    setLoading(false);
  }, [selectedTag]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 从 localStorage 读取今日已读数
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('xlvs_read');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        setReadCount(data.count);
      } else {
        localStorage.setItem('xlvs_read', JSON.stringify({ date: today, count: 0 }));
      }
    }
  }, []);

  const handleArticleClick = async (article: Article) => {
    if (readCount >= DAILY_LIMIT) return;

    setSelectedArticle(article);
    if (!article.is_read) {
      await markRead(article.id);
      const newCount = readCount + 1;
      setReadCount(newCount);
      localStorage.setItem(
        'xlvs_read',
        JSON.stringify({ date: new Date().toDateString(), count: newCount })
      );
    }
  };

  const allRead = readCount >= DAILY_LIMIT;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header - 模仿小红书顶栏 */}
      <header className="sticky top-0 z-40 bg-white">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🌿</span>
            <span className="text-base font-bold text-gray-800">小绿书</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-300">
              {readCount}/{DAILY_LIMIT}
            </span>
            <button
              onClick={() => setShowFeeds(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 标签栏 - 类似小红书的频道切换 */}
        <TagFilter
          tags={tags}
          selected={selectedTag}
          onSelect={setSelectedTag}
        />
      </header>

      {/* Content */}
      <main className="px-1.5 pt-1.5 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : allRead ? (
          <DailyComplete count={readCount} limit={DAILY_LIMIT} />
        ) : articles.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🌱</p>
            <p className="text-sm text-gray-400 mb-1">还没有内容</p>
            <p className="text-xs text-gray-300 mb-5">添加一些有趣的订阅源吧</p>
            <button
              onClick={() => setShowFeeds(true)}
              className="px-6 py-2.5 bg-green-500 text-white text-sm rounded-full font-medium"
            >
              添加订阅源
            </button>
          </div>
        ) : (
          /* 瀑布流 - 间距更小，更紧凑 */
          <div className="columns-2 gap-1.5">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => handleArticleClick(article)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail overlay */}
      {selectedArticle && (
        <ArticleDetail
          article={selectedArticle}
          onBack={() => setSelectedArticle(null)}
        />
      )}

      {/* Feed manager */}
      {showFeeds && (
        <FeedManager onClose={() => { setShowFeeds(false); loadData(); }} />
      )}
    </div>
  );
}

export default App;
