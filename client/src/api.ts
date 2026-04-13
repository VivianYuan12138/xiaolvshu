const BASE = '/api';

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

export async function fetchArticles(minScore = 6, tag?: string): Promise<{ articles: Article[]; dailyLimit: number; count: number }> {
  const params = new URLSearchParams({ minScore: String(minScore) });
  if (tag) params.set('tag', tag);
  const res = await fetch(`${BASE}/articles?${params}`);
  return res.json();
}

export async function fetchTags(): Promise<Tag[]> {
  const res = await fetch(`${BASE}/articles/tags`);
  return res.json();
}

export async function markRead(id: number) {
  await fetch(`${BASE}/articles/${id}/read`, { method: 'POST' });
}

export async function fetchFeeds(): Promise<Feed[]> {
  const res = await fetch(`${BASE}/feeds`);
  return res.json();
}

export async function addFeed(url: string, title?: string) {
  const res = await fetch(`${BASE}/feeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title }),
  });
  return res.json();
}

export async function deleteFeed(id: number) {
  await fetch(`${BASE}/feeds/${id}`, { method: 'DELETE' });
}

export async function refreshFeeds() {
  const res = await fetch(`${BASE}/feeds/refresh`, { method: 'POST' });
  return res.json();
}

export async function triggerScore(limit = 10) {
  const res = await fetch(`${BASE}/articles/score?limit=${limit}`, { method: 'POST' });
  return res.json();
}

export async function triggerRewrite(limit = 10) {
  const res = await fetch(`${BASE}/articles/rewrite?limit=${limit}`, { method: 'POST' });
  return res.json();
}
