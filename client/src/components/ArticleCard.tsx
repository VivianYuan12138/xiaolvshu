import type { Article } from '../api';

interface Props {
  article: Article;
  onClick: () => void;
}

// 根据作者人设生成头像颜色
const PERSONA_COLORS: Record<string, string> = {
  '科技小明': 'bg-blue-400',
  '投资笔记': 'bg-amber-400',
  '生活观察': 'bg-pink-400',
  '深度阅读': 'bg-purple-400',
};

// 生成封面占位图（渐变色，基于文章id）
const COVER_GRADIENTS = [
  'from-green-200 to-emerald-300',
  'from-blue-200 to-cyan-300',
  'from-amber-200 to-orange-300',
  'from-pink-200 to-rose-300',
  'from-violet-200 to-purple-300',
  'from-teal-200 to-green-300',
];

export function ArticleCard({ article, onClick }: Props) {
  const displayTitle = article.rewritten_title || article.title;
  const persona = article.author_persona || article.feed_title;
  const avatarColor = PERSONA_COLORS[persona] || 'bg-green-400';
  const tags: string[] = article.ai_tags ? JSON.parse(article.ai_tags) : [];
  const gradient = COVER_GRADIENTS[article.id % COVER_GRADIENTS.length];
  const score = article.ai_score;

  // 根据 id 做伪随机封面高度，模拟小红书的参差感
  const heights = ['h-32', 'h-40', 'h-48', 'h-36', 'h-44'];
  const coverHeight = heights[article.id % heights.length];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg overflow-hidden cursor-pointer
                 active:scale-[0.98] transition-transform duration-150
                 break-inside-avoid mb-2.5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* 封面图 */}
      {article.image_url ? (
        <img
          src={article.image_url}
          alt=""
          className={`w-full ${coverHeight} object-cover`}
          loading="lazy"
          onError={(e) => {
            // 图片加载失败时显示渐变占位
            const el = e.target as HTMLImageElement;
            el.style.display = 'none';
            el.parentElement!.querySelector('.placeholder')?.classList.remove('hidden');
          }}
        />
      ) : null}
      {/* 渐变占位封面（无图时 或 图片加载失败） */}
      {!article.image_url && (
        <div className={`w-full ${coverHeight} bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {tags[0] && (
            <span className="text-white/80 text-lg font-medium">{tags[0]}</span>
          )}
        </div>
      )}

      {/* 内容区 */}
      <div className="p-2.5">
        {/* 标题 */}
        <h3 className="text-[13px] font-semibold text-gray-800 leading-[1.4] line-clamp-2 mb-2">
          {displayTitle}
        </h3>

        {/* 底部：头像 + 作者名 + 点赞 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-4 h-4 rounded-full ${avatarColor} shrink-0 flex items-center justify-center`}>
              <span className="text-white text-[8px] font-bold">
                {persona.charAt(0)}
              </span>
            </div>
            <span className="text-[11px] text-gray-400 truncate">
              {persona}
            </span>
          </div>

          {score != null && score > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="text-[11px] text-gray-400">{score.toFixed(0)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
