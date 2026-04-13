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

const GRADIENTS = [
  'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
  'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 50%, #6ee7b7 100%)',
  'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
  'linear-gradient(135deg, #ede9fe 0%, #c4b5fd 50%, #a78bfa 100%)',
  'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)',
  'linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #60a5fa 100%)',
  'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 50%, #34d399 100%)',
  'linear-gradient(135deg, #fee2e2 0%, #fca5a5 50%, #f87171 100%)',
];

export function ArticleCard({ article, onClick, index }: Props) {
  const displayTitle = article.rewritten_title || article.title;
  const persona = article.author_persona || article.feed_title;
  const pConfig = PERSONA_CONFIG[persona] || { color: '#6b7280', icon: persona.charAt(0) };
  const score = article.ai_score;
  const gradient = GRADIENTS[article.id % GRADIENTS.length];

  // Parse tags
  let tags: string[] = [];
  try { tags = article.ai_tags ? JSON.parse(article.ai_tags) : []; } catch {}

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
          {/* Score overlay */}
          {score != null && score >= 7 && (
            <div className="absolute top-2 right-2 score-badge bg-white/80 backdrop-blur-sm text-emerald-600">
              🔥 {score.toFixed(0)}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`w-full ${coverAspect} flex items-center justify-center relative`}
          style={{ background: gradient }}
        >
          <span className="text-5xl opacity-30">{pConfig.icon}</span>
          {score != null && score >= 7 && (
            <div className="absolute top-2 right-2 score-badge bg-white/80 backdrop-blur-sm text-emerald-600">
              🔥 {score.toFixed(0)}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-3 pt-2.5 pb-3">
        <h3 className="text-[13px] font-semibold text-[#1a1a1a] leading-[1.4] line-clamp-2 mb-2">
          {displayTitle}
        </h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {tags.slice(0, 2).map(tag => (
              <span key={tag} className="tag-pill bg-emerald-50 text-emerald-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Author row */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center"
            style={{ backgroundColor: pConfig.color + '18' }}
          >
            <span className="text-[9px]">{pConfig.icon}</span>
          </div>
          <span className="text-[11px] text-[#9ca3af] truncate leading-none">
            {persona}
          </span>
        </div>
      </div>
    </div>
  );
}
