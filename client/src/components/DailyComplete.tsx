import { useMemo } from 'react';
import type { Article } from '../api';

interface Props {
  count: number;
  limit: number;
  articles?: Article[];
}

const PALETTE = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#065f46'];

function useTagDistribution(articles: Article[] | undefined) {
  return useMemo(() => {
    if (!articles?.length) return [];
    const counts = new Map<string, number>();
    for (const a of articles) {
      if (!a.is_read) continue;
      try {
        const tags: string[] = a.ai_tags ? JSON.parse(a.ai_tags) : [];
        const tag = tags[0];
        if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      } catch { /* ignore */ }
    }
    const total = [...counts.values()].reduce((s, n) => s + n, 0);
    if (!total) return [];
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, n], i) => ({ tag, n, pct: n / total, color: PALETTE[i] }));
  }, [articles]);
}

export function DailyComplete({ count, limit, articles }: Props) {
  const dist = useTagDistribution(articles);

  return (
    <div className="flex flex-col items-center pt-20 px-8 fade-in">
      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
        <span className="text-4xl">🌿</span>
      </div>
      <h2 className="text-base font-bold text-[#333] mb-1">今天看完了</h2>
      <p className="text-xs text-[#999] text-center mb-1">
        读完 {count}/{limit} 篇优质内容
      </p>
      <p className="text-xs text-[#ccc] text-center">去做点别的事情吧，明天见 🌱</p>

      {dist.length > 0 && (
        <div className="mt-8 w-full max-w-xs bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] text-[#999] mb-3">今日主题分布</p>
          <div className="flex w-full h-2 rounded-full overflow-hidden mb-3">
            {dist.map(d => (
              <div
                key={d.tag}
                style={{ width: `${d.pct * 100}%`, backgroundColor: d.color }}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            {dist.map(d => (
              <div key={d.tag} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[#333] flex-1 truncate">{d.tag}</span>
                <span className="text-[#999]">{d.n} 篇</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
