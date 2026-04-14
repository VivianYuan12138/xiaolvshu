import { useState, useRef, useEffect } from 'react';
import type { Article, Comment } from '../api';
import { fetchComments, postComment } from '../api';

interface Props {
  article: Article;
  onBack: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

const PERSONA_CONFIG: Record<string, { color: string; icon: string }> = {
  '科技小明': { color: '#3b82f6', icon: '⚡' },
  '投资笔记': { color: '#f59e0b', icon: '📈' },
  '生活观察': { color: '#ec4899', icon: '🌿' },
  '深度阅读': { color: '#8b5cf6', icon: '📖' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function renderMarkdown(content: string) {
  return content.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-3" />;
    if (line.startsWith('### '))
      return <h3 key={i} className="text-[15px] font-bold text-[#1a1a1a] mt-5 mb-1.5">{line.slice(4)}</h3>;
    if (line.startsWith('## '))
      return <h2 key={i} className="text-base font-bold text-[#1a1a1a] mt-6 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith('# '))
      return <h2 key={i} className="text-lg font-bold text-[#1a1a1a] mt-6 mb-2">{line.slice(2)}</h2>;
    if (line.startsWith('- **') || line.startsWith('- ')) {
      const text = line.slice(2);
      return (
        <div key={i} className="flex gap-2 pl-1 py-0.5">
          <span className="text-emerald-400 mt-1.5 text-[8px]">●</span>
          <p className="flex-1 text-[15px] text-[#444] leading-[1.75]"
             dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#1a1a1a] font-semibold">$1</strong>') }} />
        </div>
      );
    }
    return (
      <p key={i} className="text-[15px] text-[#444] leading-[1.8]"
         dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#1a1a1a] font-semibold">$1</strong>') }} />
    );
  });
}

export function ArticleDetail({ article, onBack, isFavorited, onToggleFavorite }: Props) {
  const [closing, setClosing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [streamingReply, setStreamingReply] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const commentEndRef = useRef<HTMLDivElement>(null);
  const streamingReplyRef = useRef('');

  const tags: string[] = article.ai_tags ? JSON.parse(article.ai_tags) : [];
  const displayTitle = article.rewritten_title || article.title;
  const displayContent = article.rewritten_content || article.content || article.summary;
  const persona = article.author_persona || article.feed_title;
  const pConfig = PERSONA_CONFIG[persona] || { color: '#6b7280', icon: persona.charAt(0) };
  const isMarkdown = article.rewritten_content != null;

  // 加载历史评论
  useEffect(() => {
    fetchComments(article.id).then(setComments).catch(() => {});
  }, [article.id]);

  // 流式回复时自动滚动
  useEffect(() => {
    if (streamingReply || comments.length > 0) {
      commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingReply, comments.length]);

  const handleBack = () => {
    abortRef.current?.abort();
    setClosing(true);
    setTimeout(onBack, 280);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    setInputValue('');
    setIsStreaming(true);
    setStreamingReply('');
    streamingReplyRef.current = '';

    const abortController = new AbortController();
    abortRef.current = abortController;

    await postComment(
      article.id,
      text,
      null,
      {
        onUserCommentId: (id) => {
          setComments(prev => [...prev, {
            id,
            article_id: article.id,
            role: 'user',
            content: text,
            parent_id: null,
            created_at: new Date().toISOString(),
          }]);
        },
        onDelta: (delta) => {
          streamingReplyRef.current += delta;
          setStreamingReply(streamingReplyRef.current);
        },
        onDone: (aiCommentId) => {
          const finalContent = streamingReplyRef.current;
          setComments(prev => {
            const userComment = prev[prev.length - 1];
            return [...prev, {
              id: aiCommentId,
              article_id: article.id,
              role: 'author',
              content: finalContent,
              parent_id: userComment?.id ?? null,
              created_at: new Date().toISOString(),
            }];
          });
          setStreamingReply('');
          streamingReplyRef.current = '';
          setIsStreaming(false);
          abortRef.current = null;
        },
        onError: (error) => {
          const partial = streamingReplyRef.current;
          if (partial) {
            setComments(prev => [...prev, {
              id: 0,
              article_id: article.id,
              role: 'author',
              content: partial,
              parent_id: null,
              created_at: new Date().toISOString(),
            }]);
          }
          setStreamingReply('');
          streamingReplyRef.current = '';
          setIsStreaming(false);
          abortRef.current = null;
        },
      },
      abortController.signal,
    );
  };

  // 评论线程组织
  const topComments = comments.filter(c => c.role === 'user');
  const repliesMap = new Map<number, Comment[]>();
  for (const c of comments) {
    if (c.role === 'author' && c.parent_id) {
      const arr = repliesMap.get(c.parent_id) || [];
      arr.push(c);
      repliesMap.set(c.parent_id, arr);
    }
  }
  const lastUserComment = topComments[topComments.length - 1];

  return (
    <div className={`fixed inset-0 bg-[#f5f7f5] z-50 overflow-y-auto ${closing ? 'slide-up-exit' : 'slide-up-enter'}`}>
      {/* Header */}
      <div className="sticky top-0 glass border-b border-white/40 px-3 py-2.5 flex items-center justify-between z-10">
        <button onClick={handleBack} className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center press-scale">
          <svg className="w-4.5 h-4.5 text-[#333]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: pConfig.color + '15' }}
          >
            <span className="text-sm">{pConfig.icon}</span>
          </div>
          <span className="text-sm font-semibold text-[#333]">{persona}</span>
        </div>

        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-600 font-medium px-3 py-1.5 bg-emerald-50 rounded-full press-scale"
        >
          原文
        </a>
      </div>

      {/* Cover */}
      {article.image_url && (
        <img src={article.image_url} alt="" className="w-full max-h-[45vh] object-cover" />
      )}

      {/* Body */}
      <div className="bg-white rounded-t-3xl -mt-4 relative z-10 px-5 pt-6 pb-28 min-h-[60vh]">
        <h1 className="text-xl font-bold text-[#1a1a1a] leading-snug mb-5 tracking-tight">
          {displayTitle}
        </h1>

        {isMarkdown ? (
          <div className="space-y-0.5">{renderMarkdown(displayContent)}</div>
        ) : (
          <div
            className="text-[15px] text-[#444] leading-[1.8]
                       [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full
                       [&_a]:text-emerald-600 [&_a]:no-underline
                       [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8">
            {tags.map((tag) => (
              <span key={tag} className="tag-pill bg-emerald-50 text-emerald-600 text-xs">
                # {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="mt-8 pt-4 border-t border-[#f0f0f0] space-y-1.5">
          {article.published_at && (
            <p className="text-xs text-[#bbb]">
              {new Date(article.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          {article.ai_summary && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {article.ai_summary}
            </p>
          )}
        </div>

        {/* 评论区 */}
        {(topComments.length > 0 || isStreaming) && (
          <div className="mt-8 pt-5 border-t border-[#f0f0f0]">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-sm font-semibold text-[#1a1a1a]">评论</span>
              <span className="text-xs text-[#ccc]">{topComments.length}</span>
            </div>

            <div className="space-y-5">
              {topComments.map((comment) => {
                const replies = repliesMap.get(comment.id) || [];
                const isLastAndStreaming = isStreaming && comment.id === lastUserComment?.id;

                return (
                  <div key={comment.id}>
                    {/* 用户评论 */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 shrink-0 flex items-center justify-center">
                        <span className="text-xs text-emerald-700">我</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[#333]">我</span>
                          <span className="text-[11px] text-[#ccc]">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-[14px] text-[#444] leading-relaxed mt-1">{comment.content}</p>
                      </div>
                    </div>

                    {/* 作者回复 */}
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 mt-3 ml-11">
                        <div
                          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: pConfig.color + '15' }}
                        >
                          <span className="text-xs">{pConfig.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[#333]">{persona}</span>
                            <span className="text-[10px] text-white bg-emerald-500 px-1.5 py-0.5 rounded leading-none">作者</span>
                            <span className="text-[11px] text-[#ccc]">{timeAgo(reply.created_at)}</span>
                          </div>
                          <p className="text-[14px] text-[#444] leading-relaxed mt-1">{reply.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* 流式回复中 */}
                    {isLastAndStreaming && streamingReply && (
                      <div className="flex gap-3 mt-3 ml-11">
                        <div
                          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: pConfig.color + '15' }}
                        >
                          <span className="text-xs">{pConfig.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[#333]">{persona}</span>
                            <span className="text-[10px] text-white bg-emerald-500 px-1.5 py-0.5 rounded leading-none">作者</span>
                          </div>
                          <p className="text-[14px] text-[#444] leading-relaxed mt-1">
                            {streamingReply}
                            <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 正在等待回复 */}
                    {isLastAndStreaming && !streamingReply && (
                      <div className="flex gap-3 mt-3 ml-11">
                        <div
                          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: pConfig.color + '15' }}
                        >
                          <span className="text-xs">{pConfig.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[#333]">{persona}</span>
                            <span className="text-[10px] text-white bg-emerald-500 px-1.5 py-0.5 rounded leading-none">作者</span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ccc] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ccc] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ccc] animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div ref={commentEndRef} />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 glass border-t border-white/40 px-4 py-2.5 flex items-center gap-2 z-[60]"
        style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}
      >
        <input
          type="text"
          placeholder={`说点什么...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend(); }}
          className="flex-1 px-4 py-2.5 bg-[#f0f2f0] rounded-2xl text-sm placeholder:text-[#ccc] focus:outline-none focus:ring-1 focus:ring-emerald-300"
          disabled={isStreaming}
        />

        {inputValue.trim() ? (
          <button
            onClick={handleSend}
            disabled={isStreaming}
            className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center press-scale shrink-0 disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        ) : (
          <button onClick={onToggleFavorite} className="p-2 press-scale">
            <svg
              className={`w-6 h-6 transition-all ${isFavorited ? 'text-emerald-500 fill-emerald-500 scale-110' : 'text-[#ccc]'}`}
              fill={isFavorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        )}

        <a href={article.link} target="_blank" rel="noopener noreferrer" className="p-2 press-scale">
          <svg className="w-6 h-6 text-[#ccc]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
