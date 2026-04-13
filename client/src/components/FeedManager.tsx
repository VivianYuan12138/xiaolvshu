import { useState, useEffect } from 'react';
import { fetchFeeds, addFeed, deleteFeed, refreshFeeds, triggerRewrite, type Feed } from '../api';

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
      setMessage('添加成功，正在抓取内容...');
      const updated = await fetchFeeds();
      setFeeds(updated);
    } catch (err) {
      setMessage('添加失败: ' + (err as Error).message);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('正在刷新所有订阅...');
    await refreshFeeds();
    setMessage('刷新完成，作者Agent正在改写内容...');
    await triggerRewrite(20);
    setMessage('全部完成!');
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    await deleteFeed(id);
    setFeeds(feeds.filter((f) => f.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">管理订阅</h2>
        <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* 添加订阅 */}
        <div className="flex gap-2 mb-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入 RSS 链接..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl
                       focus:outline-none focus:border-green-400"
          />
          <button
            onClick={handleAdd}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white text-sm rounded-xl
                       disabled:opacity-50"
          >
            添加
          </button>
        </div>

        {message && (
          <p className="text-xs text-green-600 mb-4">{message}</p>
        )}

        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="w-full py-2.5 mb-5 bg-green-50 text-green-700 text-sm rounded-xl
                     disabled:opacity-50"
        >
          {loading ? '处理中...' : '刷新订阅 & 作者Agent改写'}
        </button>

        {/* 订阅列表 */}
        <div className="space-y-2">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {feed.title}
                </p>
                <p className="text-xs text-gray-400 truncate">{feed.url}</p>
              </div>
              <button
                onClick={() => handleDelete(feed.id)}
                className="ml-2 text-red-400 text-xs shrink-0"
              >
                删除
              </button>
            </div>
          ))}
          {feeds.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              还没有订阅源，添加一个试试吧
            </p>
          )}
        </div>

        {/* 推荐源 */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">推荐订阅</h3>
          <div className="space-y-2">
            {[
              { title: 'Hacker News Best', url: 'https://hnrss.org/best' },
              { title: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml' },
              { title: 'Paul Graham Essays', url: 'https://www.aaronswartz.com/2002/feeds/pgessays.rss' },
              { title: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
            ].map((rec) => {
              const alreadyAdded = feeds.some(f => f.url === rec.url);
              return (
                <button
                  key={rec.url}
                  disabled={alreadyAdded || loading}
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
                  className={`w-full text-left p-2.5 rounded-xl ${
                    alreadyAdded ? 'bg-gray-100 opacity-50' : 'bg-green-50'
                  }`}
                >
                  <p className="text-sm text-green-800">{rec.title}</p>
                  <p className="text-xs text-green-600/60 truncate">
                    {alreadyAdded ? '已添加' : rec.url}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
