import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchArticles, fetchTags, markRead, searchArticles, type Article, type Tag } from './api';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetail } from './components/ArticleDetail';
import { TagFilter } from './components/TagFilter';
import { FeedManager } from './components/FeedManager';
import { DailyComplete } from './components/DailyComplete';
import { SkeletonGrid } from './components/SkeletonCard';
import { BottomNav } from './components/BottomNav';
import { SearchBar } from './components/SearchBar';
import { FavoritesPage } from './components/FavoritesPage';

const DAILY_LIMIT = 999;

function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showFeeds, setShowFeeds] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'favorites' | 'settings'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[] | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // 加载收藏
  useEffect(() => {
    const stored = localStorage.getItem('xlvs_favs');
    if (stored) setFavorites(JSON.parse(stored));
  }, []);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('xlvs_favs', JSON.stringify(next));
      return next;
    });
  };

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

  // 今日已读
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

  // 搜索（防抖）
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(async () => {
      const results = await searchArticles(q);
      setSearchResults(results);
    }, 300);
  };

  const displayArticles = searchResults ?? articles;

  const allRead = readCount >= DAILY_LIMIT;

  return (
    <div className="min-h-screen bg-[#f2f2f2] pb-16">
      {/* ===== 发现页 ===== */}
      {activeTab === 'discover' && (
        <>
          <header className="sticky top-0 z-40 bg-white">
            {/* 搜索栏 */}
            <SearchBar value={searchQuery} onChange={handleSearch} />
            {/* 标签栏 */}
            <TagFilter tags={tags} selected={selectedTag} onSelect={setSelectedTag} />
          </header>

          <main className="px-1.5 pt-1 pb-4">
            {loading ? (
              <SkeletonGrid />
            ) : allRead ? (
              <DailyComplete count={readCount} limit={DAILY_LIMIT} />
            ) : displayArticles.length === 0 ? (
              <div className="text-center pt-28">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🌱</span>
                </div>
                <p className="text-sm text-[#999] mb-1">
                  {searchQuery ? '没有找到相关内容' : '还没有内容'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowFeeds(true)}
                    className="mt-4 px-6 py-2.5 bg-[#ff2442] text-white text-sm rounded-full font-medium press-scale"
                  >
                    添加订阅源
                  </button>
                )}
              </div>
            ) : (
              <div className="columns-2 gap-2">
                {displayArticles.map((article, i) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onClick={() => handleArticleClick(article)}
                    index={i}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* ===== 收藏页 ===== */}
      {activeTab === 'favorites' && (
        <>
          <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
            <div className="px-4 py-3">
              <h1 className="text-base font-bold text-[#333]">我的收藏</h1>
            </div>
          </header>
          <FavoritesPage
            favorites={favorites}
            articles={articles}
            onArticleClick={handleArticleClick}
          />
        </>
      )}

      {/* ===== 我的页 ===== */}
      {activeTab === 'settings' && (
        <>
          <header className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
            <div className="px-4 py-3">
              <h1 className="text-base font-bold text-[#333]">我的</h1>
            </div>
          </header>
          <div className="p-4 space-y-3">
            {/* 用户卡片 */}
            <div className="bg-white rounded-xl p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <span className="text-2xl">🌿</span>
              </div>
              <div>
                <p className="font-bold text-[#333]">小绿书用户</p>
                <p className="text-xs text-[#999]">只看好内容，不焦虑</p>
              </div>
            </div>

            {/* 数据统计 */}
            <div className="bg-white rounded-xl p-4">
              <div className="grid grid-cols-3 text-center">
                <div>
                  <p className="text-lg font-bold text-[#333]">{articles.length}</p>
                  <p className="text-[11px] text-[#999]">文章总数</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#333]">{favorites.length}</p>
                  <p className="text-[11px] text-[#999]">收藏</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#333]">{readCount}</p>
                  <p className="text-[11px] text-[#999]">今日已读</p>
                </div>
              </div>
            </div>

            {/* 功能列表 */}
            <div className="bg-white rounded-xl overflow-hidden">
              <button
                onClick={() => setShowFeeds(true)}
                className="w-full px-4 py-3.5 flex items-center justify-between border-b border-[#f5f5f5] press-scale"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📡</span>
                  <span className="text-sm text-[#333]">管理订阅源</span>
                </div>
                <svg className="w-4 h-4 text-[#ccc]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="w-full px-4 py-3.5 flex items-center justify-between border-b border-[#f5f5f5]">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎯</span>
                  <span className="text-sm text-[#333]">每日阅读上限</span>
                </div>
                <span className="text-sm text-[#999]">{DAILY_LIMIT} 篇</span>
              </button>
              <button className="w-full px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">✨</span>
                  <span className="text-sm text-[#333]">最低质量评分</span>
                </div>
                <span className="text-sm text-[#999]">6 分</span>
              </button>
            </div>

            {/* 关于 */}
            <div className="text-center pt-6">
              <p className="text-xs text-[#ccc]">小绿书 v0.3.0</p>
              <p className="text-[10px] text-[#ddd] mt-1">只看真正好的内容</p>
            </div>
          </div>
        </>
      )}

      {/* ===== 底部导航 ===== */}
      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        readCount={readCount}
        dailyLimit={DAILY_LIMIT}
      />

      {/* ===== 文章详情 ===== */}
      {selectedArticle && (
        <ArticleDetail
          article={selectedArticle}
          onBack={() => setSelectedArticle(null)}
          isFavorited={favorites.includes(selectedArticle.id)}
          onToggleFavorite={() => toggleFavorite(selectedArticle.id)}
        />
      )}

      {/* ===== 订阅管理 ===== */}
      {showFeeds && (
        <FeedManager onClose={() => { setShowFeeds(false); loadData(); }} />
      )}
    </div>
  );
}

export default App;
