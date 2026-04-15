import { useState } from 'react';
import { addFeed } from '../api';

interface Props {
  onDone: () => void;
  onManage: () => void;
}

const RECOMMENDED = [
  { title: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml', desc: '每周科技爱好者周刊', icon: '📰' },
  { title: '少数派', url: 'https://sspai.com/feed', desc: '数字生活与效率', icon: '🎯' },
  { title: 'Paul Graham', url: 'http://www.aaronsw.com/2002/feeds/pgessays.rss', desc: '创业与思考', icon: '💡' },
  { title: '谷歌黑板报', url: 'https://feeds.feedburner.com/googleblog', desc: '技术前沿', icon: '🔬' },
  { title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', desc: '科技与文化', icon: '🌐' },
];

export function EmptyRecommend({ onDone, onManage }: Props) {
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const handleAdd = async (url: string, title: string) => {
    if (added.has(url) || adding) return;
    setAdding(url);
    try {
      await addFeed(url, title);
      setAdded(prev => new Set(prev).add(url));
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="pt-12 px-6 fade-in">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
          <span className="text-3xl">🌱</span>
        </div>
        <p className="text-[15px] font-semibold text-[#1a1a1a] mb-1">从这里开始你的精选阅读</p>
        <p className="text-xs text-[#999]">一键订阅几个高质量信息源</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {RECOMMENDED.map((item, i) => {
          const isAdded = added.has(item.url);
          const isAdding = adding === item.url;
          return (
            <div
              key={item.url}
              className={`flex items-center gap-3 px-4 py-3.5 ${i !== RECOMMENDED.length - 1 ? 'border-b border-[#f5f5f5]' : ''}`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <span className="text-lg">{item.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a1a] truncate">{item.title}</p>
                <p className="text-[11px] text-[#999] truncate">{item.desc}</p>
              </div>
              <button
                onClick={() => handleAdd(item.url, item.title)}
                disabled={isAdded || isAdding}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 press-scale ${
                  isAdded
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                }`}
              >
                {isAdded ? '已订阅' : isAdding ? '添加中' : '订阅'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onManage}
          className="flex-1 py-2.5 rounded-full bg-white text-[#666] text-sm font-medium border border-[#eee] press-scale"
        >
          自己添加
        </button>
        <button
          onClick={onDone}
          disabled={added.size === 0}
          className="flex-1 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-medium shadow-sm shadow-emerald-200 press-scale disabled:opacity-40"
        >
          {added.size > 0 ? `完成（${added.size}）` : '完成'}
        </button>
      </div>
    </div>
  );
}
