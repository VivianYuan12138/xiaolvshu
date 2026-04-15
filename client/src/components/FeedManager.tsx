import { useState, useEffect } from 'react';
import { fetchFeeds, addFeed, deleteFeed, refreshFeeds, type Feed } from '../api';

interface Props {
  onClose: () => void;
}

export function FeedManager({ onClose }: Props) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchFeeds().then(setFeeds);
  }, []);

  const handleAdd = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      await addFeed(url.trim());
      setUrl('');
      setMessage('添加成功!');
      setFeeds(await fetchFeeds());
    } catch (err) {
      setMessage('添加失败: ' + (err as Error).message);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('正在刷新...');
    await refreshFeeds();
    setMessage('刷新完成！新文章将由 AI 自动处理');
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    await deleteFeed(id);
    setFeeds(feeds.filter(f => f.id !== id));
  };

  const RECOMMENDED = [
    { title: 'Hacker News 精选', url: 'https://hnrss.org/best', emoji: '🔥' },
    { title: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml', emoji: '📝' },
    { title: 'Paul Graham', url: 'https://www.aaronswartz.com/2002/feeds/pgessays.rss', emoji: '💡' },
    { title: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', emoji: '🔬' },
  ];

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto slide-up-enter">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-[#f0f0f0] px-4 py-3 flex items-center justify-between z-10">
        <h2 className="text-base font-bold text-[#333]">管理订阅</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] press-scale">
          <svg className="w-4 h-4 text-[#999]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* 添加 */}
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入 RSS 链接..."
            className="flex-1 px-3.5 py-2.5 text-sm bg-[#f5f5f5] rounded-lg
                       placeholder:text-[#ccc] focus:outline-none focus:bg-[#eee] transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-500 text-white text-sm rounded-lg font-medium
                       disabled:opacity-50 press-scale"
          >
            添加
          </button>
        </div>

        {message && (
          <p className="text-xs text-green-600 mb-3 fade-in">{message}</p>
        )}

        {/* 刷新 */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="w-full py-3 mb-5 bg-[#f5f5f5] text-[#333] text-sm rounded-lg
                     disabled:opacity-50 press-scale font-medium"
        >
          {loading ? '处理中...' : '🔄 刷新全部订阅'}
        </button>

        {/* 已添加的源 */}
        {feeds.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-[#999] mb-2 uppercase tracking-wider">已订阅</h3>
            <div className="space-y-1.5 mb-6">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="flex items-center justify-between p-3 bg-[#fafafa] rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#333] truncate">{feed.title}</p>
                    <p className="text-[11px] text-[#ccc] truncate">{feed.url}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    className="ml-2 text-[11px] text-red-400 shrink-0 press-scale"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 推荐 */}
        <h3 className="text-xs font-semibold text-[#999] mb-2 uppercase tracking-wider">推荐订阅</h3>
        <div className="space-y-1.5">
          {RECOMMENDED.map((rec) => {
            const added = feeds.some(f => f.url === rec.url);
            return (
              <button
                key={rec.url}
                disabled={added || loading}
                onClick={async () => {
                  setLoading(true);
                  setMessage(`正在添加 ${rec.title}...`);
                  try {
                    await addFeed(rec.url, rec.title);
                    setMessage(`${rec.title} 添加成功!`);
                    setFeeds(await fetchFeeds());
                  } catch (err) {
                    setMessage('添加失败: ' + (err as Error).message);
                  }
                  setLoading(false);
                }}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 press-scale ${
                  added ? 'bg-[#fafafa] opacity-40' : 'bg-emerald-50/50'
                }`}
              >
                <span className="text-xl">{rec.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#333]">{rec.title}</p>
                  <p className="text-[11px] text-[#ccc] truncate">
                    {added ? '✓ 已添加' : rec.url}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
