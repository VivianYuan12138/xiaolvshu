import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchArticles, fetchTags, markRead, searchArticles, toggleFavorite as apiToggleFavorite, fetchFavorites, type Article, type Tag } from './api';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetail } from './components/ArticleDetail';
import { TagFilter } from './components/TagFilter';
import { FeedManager } from './components/FeedManager';
import { DailyComplete } from './components/DailyComplete';
import { SkeletonGrid } from './components/SkeletonCard';
import { BottomNav } from './components/BottomNav';
import { SearchBar } from './components/SearchBar';
import { FavoritesPage } from './components/FavoritesPage';
import { EmptyRecommend } from './components/EmptyRecommend';
import { loadFavorites, saveFavorites, loadReadState, saveReadCount } from './storage';

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
  const [favorites, setFavorites] = useState<Article[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 一次性迁移：localStorage → 后端
    const legacyFavs = loadFavorites();
    if (legacyFavs.length > 0) {
      Promise.all(legacyFavs.map(a => apiToggleFavorite(a.id))).then(() => {
        localStorage.removeItem('xlvs_favs_v2');
        fetchFavorites().then(setFavorites);
      });
    } else {
      fetchFavorites().then(setFavorites);
    }
  }, []);

  const favoriteIds = favorites.map(a => a.id);

  const toggleFavorite = async (article: Article) => {
    // 乐观更新 UI
    setFavorites(prev => {
      const exists = prev.some(a => a.id === article.id);
      return exists ? prev.filter(a => a.id !== article.id) : [...prev, { ...article, is_favorited: 1 }];
    });
    await apiToggleFavorite(article.id);
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

  useEffect(() => {
    setReadCount(loadReadState().count);
  }, []);

  const handleArticleClick = async (article: Article) => {
    if (readCount >= DAILY_LIMIT) return;
    setSelectedArticle(article);
    if (!article.is_read) {
      await markRead(article.id);
      const newCount = readCount + 1;
      setReadCount(newCount);
      saveReadCount(newCount);
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
    <div className="min-h-screen bg-[#f7f8f5] pb-16">
      {/* ===== 发现页 ===== */}
      {activeTab === 'discover' && (
        <>
          <header className="sticky top-0 z-40 glass border-b border-white/40">
            {/* App title bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-200">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8 2 4 6 4 12c0 4 2 7.5 8 10 6-2.5 8-6 8-10 0-6-4-10-8-10zm0 2c.5 0 .5 16-.5 16C8 18.5 6 16 6 12c0-4.5 2.5-8 6-8z" opacity="0.9"/>
                  </svg>
                </div>
                <h1 className="text-base font-bold text-[#1a1a1a] tracking-tight">小绿书</h1>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                今日 {articles.length} 篇 · 已读 {readCount}
              </span>
            </div>
            {/* 搜索栏 */}
            <SearchBar value={searchQuery} onChange={handleSearch} />
            {/* 标签栏 */}
            <TagFilter tags={tags} selected={selectedTag} onSelect={setSelectedTag} />
          </header>

          <main className="px-2 pt-2 pb-4">
            {loading ? (
              <SkeletonGrid />
            ) : allRead ? (
              <DailyComplete count={readCount} limit={DAILY_LIMIT} articles={articles} />
            ) : displayArticles.length === 0 ? (
              searchQuery ? (
                <div className="text-center pt-28">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🔍</span>
                  </div>
                  <p className="text-sm text-[#999]">没有找到相关内容</p>
                </div>
              ) : (
                <EmptyRecommend onDone={loadData} onManage={() => setShowFeeds(true)} />
              )
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
          <header className="sticky top-0 z-40 glass border-b border-white/40">
            <div className="px-4 py-3">
              <h1 className="text-base font-bold text-[#1a1a1a]">我的收藏</h1>
            </div>
          </header>
          <FavoritesPage
            favorites={favorites}
            onArticleClick={handleArticleClick}
          />
        </>
      )}

      {/* ===== 我的页 ===== */}
      {activeTab === 'settings' && (
        <>
          <header className="sticky top-0 z-40 glass border-b border-white/40">
            <div className="px-4 py-3">
              <h1 className="text-base font-bold text-[#1a1a1a]">我的</h1>
            </div>
          </header>
          <div className="p-4 space-y-3">
            {/* 用户卡片 */}
            <div className="bg-emerald-50 border border-emerald-100/60 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <span className="text-2xl">🌿</span>
              </div>
              <div>
                <p className="font-bold text-emerald-900 text-lg">小绿书用户</p>
                <p className="text-xs text-emerald-700/70 mt-0.5">只看好内容，不焦虑</p>
              </div>
            </div>

            {/* 数据统计 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="grid grid-cols-3 text-center divide-x divide-[#f0f0f0]">
                <div>
                  <p className="text-xl font-bold text-emerald-600">{articles.length}</p>
                  <p className="text-[11px] text-[#999] mt-0.5">精选文章</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-600">{favorites.length}</p>
                  <p className="text-[11px] text-[#999] mt-0.5">我的收藏</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-600">{readCount}</p>
                  <p className="text-[11px] text-[#999] mt-0.5">今日已读</p>
                </div>
              </div>
            </div>

            {/* 功能列表 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setShowFeeds(true)}
                className="w-full px-4 py-4 flex items-center justify-between border-b border-[#f5f5f5] press-scale"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><span className="text-base">📡</span></div>
                  <span className="text-sm text-[#333] font-medium">管理订阅源</span>
                </div>
                <svg className="w-4 h-4 text-[#d0d0d0]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="w-full px-4 py-4 flex items-center justify-between border-b border-[#f5f5f5]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center"><span className="text-base">✨</span></div>
                  <span className="text-sm text-[#333] font-medium">内容质量过滤</span>
                </div>
                <span className="text-xs text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">≥ 5分</span>
              </button>
              <button className="w-full px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"><span className="text-base">🤖</span></div>
                  <span className="text-sm text-[#333] font-medium">AI 引擎</span>
                </div>
                <span className="text-xs text-[#999]">DeepSeek V3</span>
              </button>
            </div>

            {/* 关于 */}
            <div className="text-center pt-8 pb-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-200">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8 2 4 6 4 12c0 4 2 7.5 8 10 6-2.5 8-6 8-10 0-6-4-10-8-10zm0 2c.5 0 .5 16-.5 16C8 18.5 6 16 6 12c0-4.5 2.5-8 6-8z" opacity="0.9"/>
                </svg>
              </div>
              <p className="text-xs text-[#bbb] font-medium">小绿书 v0.3.0</p>
              <p className="text-[10px] text-[#ddd] mt-0.5">只看真正好的内容</p>
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
          isFavorited={favoriteIds.includes(selectedArticle.id)}
          onToggleFavorite={() => toggleFavorite(selectedArticle)}
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
