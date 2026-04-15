const BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Article {
  id: number;
  feed_id: number;
  title: string;
  link: string;
  content: string;
  summary: string;
  image_url: string | null;
  author: string;
  published_at: string;
  ai_score: number | null;
  ai_tags: string | null;
  ai_summary: string | null;
  is_read: number;
  is_favorited: number;
  feed_title: string;
  rewritten_title: string | null;
  rewritten_content: string | null;
  author_persona: string | null;
}

export interface Feed {
  id: number;
  title: string;
  url: string;
  type: string;
  created_at: string;
}

export interface Tag {
  tag: string;
  count: number;
}

export interface ArticlesResponse {
  articles: Article[];
  total: number;
  offset: number;
  hasMore: boolean;
  count: number;
}

export async function fetchArticles(minScore = 6, tag?: string, offset = 0, limit = 20): Promise<ArticlesResponse> {
  const params = new URLSearchParams({ minScore: String(minScore), offset: String(offset), limit: String(limit) });
  if (tag) params.set('tag', tag);
  const res = await fetch(`${BASE}/articles?${params}`);
  return jsonOrThrow(res);
}

export async function fetchTags(): Promise<Tag[]> {
  const res = await fetch(`${BASE}/articles/tags`);
  return jsonOrThrow(res);
}

export async function markRead(id: number) {
  const res = await fetch(`${BASE}/articles/${id}/read`, { method: 'POST' });
  return jsonOrThrow(res);
}

export async function fetchFeeds(): Promise<Feed[]> {
  const res = await fetch(`${BASE}/feeds`);
  return jsonOrThrow(res);
}

export async function addFeed(url: string, title?: string) {
  const res = await fetch(`${BASE}/feeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title }),
  });
  return jsonOrThrow(res);
}

export async function deleteFeed(id: number) {
  const res = await fetch(`${BASE}/feeds/${id}`, { method: 'DELETE' });
  return jsonOrThrow(res);
}

export async function refreshFeeds() {
  const res = await fetch(`${BASE}/feeds/refresh`, { method: 'POST' });
  return jsonOrThrow(res);
}

export async function toggleFavorite(id: number): Promise<{ ok: boolean; is_favorited: number }> {
  const res = await fetch(`${BASE}/articles/${id}/favorite`, { method: 'POST' });
  return jsonOrThrow(res);
}

export async function fetchFavorites(): Promise<Article[]> {
  const res = await fetch(`${BASE}/articles/favorites`);
  return jsonOrThrow(res);
}

export async function searchArticles(q: string): Promise<Article[]> {
  const res = await fetch(`${BASE}/articles/search?q=${encodeURIComponent(q)}`);
  return jsonOrThrow(res);
}

// ===== 评论区 =====

export interface Comment {
  id: number;
  article_id: number;
  role: 'user' | 'author';
  content: string;
  parent_id: number | null;
  created_at: string;
}

export async function fetchComments(articleId: number): Promise<Comment[]> {
  const res = await fetch(`${BASE}/articles/${articleId}/comments`);
  return jsonOrThrow(res);
}

export interface CommentStreamCallbacks {
  onUserCommentId: (id: number) => void;
  onDelta: (text: string) => void;
  onDone: (aiCommentId: number) => void;
  onError: (error: string) => void;
}

export async function postComment(
  articleId: number,
  content: string,
  parentId: number | null,
  callbacks: CommentStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/articles/${articleId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, parent_id: parentId }),
      signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    callbacks.onError('网络连接失败');
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    callbacks.onError(err.error || '请求失败');
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError('浏览器不支持流式读取');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) { callbacks.onError(data.error); return; }
          if (data.userCommentId) callbacks.onUserCommentId(data.userCommentId);
          if (data.done) { callbacks.onDone(data.aiCommentId); return; }
          if (data.content) callbacks.onDelta(data.content);
        } catch { /* skip malformed */ }
      }
    }
    callbacks.onDone(0);
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    callbacks.onError('连接中断');
  }
}
