import type { Article } from '../api';

interface Props {
  article: Article;
  onBack: () => void;
}

const PERSONA_COLORS: Record<string, string> = {
  '科技小明': 'bg-blue-400',
  '投资笔记': 'bg-amber-400',
  '生活观察': 'bg-pink-400',
  '深度阅读': 'bg-purple-400',
};

export function ArticleDetail({ article, onBack }: Props) {
  const tags: string[] = article.ai_tags ? JSON.parse(article.ai_tags) : [];
  const displayTitle = article.rewritten_title || article.title;
  const displayContent = article.rewritten_content || article.content || article.summary;
  const persona = article.author_persona || article.feed_title;
  const avatarColor = PERSONA_COLORS[persona] || 'bg-green-400';

  // 判断内容是否是 markdown（改写后的）还是 HTML（原始RSS）
  const isMarkdown = article.rewritten_content != null;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between z-10">
        <button onClick={onBack} className="p-1">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 作者信息 */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full ${avatarColor} flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">{persona.charAt(0)}</span>
          </div>
          <span className="text-sm font-medium text-gray-800">{persona}</span>
        </div>

        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-600 font-medium px-3 py-1 border border-green-200 rounded-full"
        >
          原文
        </a>
      </div>

      {/* 封面图 */}
      {article.image_url && (
        <img src={article.image_url} alt="" className="w-full max-h-80 object-cover" />
      )}

      {/* 正文 */}
      <div className="px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900 leading-snug mb-3">
          {displayTitle}
        </h1>

        {isMarkdown ? (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap space-y-3">
            {displayContent.split('\n').map((line, i) => {
              if (!line.trim()) return null;
              if (line.startsWith('# ')) return <h2 key={i} className="text-base font-bold text-gray-900 mt-4">{line.slice(2)}</h2>;
              if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-gray-800 mt-3">{line.slice(3)}</h3>;
              if (line.startsWith('- ')) return <p key={i} className="pl-3 border-l-2 border-green-300">{line.slice(2)}</p>;
              return <p key={i}>{line}</p>;
            })}
          </div>
        ) : (
          <div
            className="text-sm text-gray-700 leading-relaxed
                       [&_img]:rounded-lg [&_img]:my-3 [&_img]:w-full
                       [&_a]:text-green-600 [&_a]:no-underline
                       [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        )}

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mt-5 mb-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-500"
            >
              # {tag}
            </span>
          ))}
        </div>

        {/* 发布信息 */}
        <div className="text-xs text-gray-300 mt-4 pt-4 border-t border-gray-50">
          {article.published_at && (
            <span>{new Date(article.published_at).toLocaleDateString('zh-CN')}</span>
          )}
          {article.ai_summary && (
            <span className="ml-3">AI: {article.ai_summary}</span>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-around">
        <div className="flex items-center gap-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-xs">收藏</span>
        </div>
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 bg-green-500 text-white rounded-full text-sm font-medium"
        >
          阅读原文
        </a>
        <div className="flex items-center gap-1 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="text-xs">分享</span>
        </div>
      </div>
    </div>
  );
}
