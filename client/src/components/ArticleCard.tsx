import type { Article } from '../api';

interface Props {
  article: Article;
  onClick: () => void;
  index: number;
}

const PERSONA_CONFIG: Record<string, { color: string; icon: string }> = {
  '科技小明': { color: '#3b82f6', icon: '⚡' },
  '投资笔记': { color: '#f59e0b', icon: '📈' },
  '生活观察': { color: '#ec4899', icon: '🌿' },
  '深度阅读': { color: '#8b5cf6', icon: '📖' },
};

// 收敛到绿色系 4 档：薄荷 / 鼠尾草 / 墨绿 / 米黄点缀
const GRADIENTS = [
  'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 60%, #6ee7b7 100%)',
  'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 60%, #86efac 100%)',
  'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 60%, #34d399 100%)',
  'linear-gradient(135deg, #fefce8 0%, #ecfccb 60%, #bef264 100%)',
];

// 粗略阅读时长：中文约 400 字/分钟
function estimateReadMinutes(article: Article): number {
  const text = article.rewritten_content || article.content || article.summary || '';
  const chars = text.replace(/<[^>]+>/g, '').length;
  return Math.max(1, Math.round(chars / 400));
}

export function ArticleCard({ article, onClick, index }: Props) {
  const displayTitle = article.rewritten_title || article.title;
  const persona = article.author_persona || article.feed_title;
  const pConfig = PERSONA_CONFIG[persona] || { color: '#6b7280', icon: persona.charAt(0) };
  const score = article.ai_score;
  const gradient = GRADIENTS[article.id % GRADIENTS.length];
  const readMin = estimateReadMinutes(article);

  let tags: string[] = [];
  try { tags = article.ai_tags ? JSON.parse(article.ai_tags) : []; } catch {}
  const primaryTag = tags[0];

  const aspects = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[5/6]'];
  const coverAspect = aspects[article.id % aspects.length];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer press-scale card-appear break-inside-avoid mb-3"
      style={{
        animationDelay: `${index * 60}ms`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {/* Cover */}
      {article.image_url ? (
        <div className={`w-full ${coverAspect} overflow-hidden relative`}>
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              const parent = el.parentElement!;
              el.remove();
              parent.style.background = gradient;
              parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><span class="text-4xl opacity-40">${pConfig.icon}</span></div>`;
            }}
          />
          {score != null && score >= 9 && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-emerald-700 text-[10px] font-semibold">
              精选
            </div>
          )}
        </div>
      ) : (
        <div
          className={`w-full ${coverAspect} flex items-center justify-center relative`}
          style={{ background: gradient }}
        >
          <span className="text-5xl opacity-30">{pConfig.icon}</span>
          {score != null && score >= 9 && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-emerald-700 text-[10px] font-semibold">
              精选
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-3 pt-2.5 pb-3">
        <h3 className="text-[14px] font-semibold text-[#1a1a1a] leading-[1.5] line-clamp-2 mb-2">
          {displayTitle}
        </h3>

        {/* Author + meta row */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center"
            style={{ backgroundColor: pConfig.color + '18' }}
          >
            <span className="text-[9px]">{pConfig.icon}</span>
          </div>
          <span className="text-[11px] text-[#9ca3af] truncate leading-none">
            {persona}
          </span>
          <span className="text-[11px] text-[#d1d5db] leading-none">·</span>
          <span className="text-[11px] text-[#9ca3af] leading-none shrink-0">
            {readMin} 分钟
          </span>
          {primaryTag && (
            <span className="ml-auto tag-pill bg-emerald-50 text-emerald-600 shrink-0">
              {primaryTag}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
