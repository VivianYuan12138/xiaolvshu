import type { Article } from './api';

const K = {
  favs: 'xlvs_favs_v2',
  favsLegacy: 'xlvs_favs',
  read: 'xlvs_read',
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// === Favorites: 存完整 article 快照，保证收藏页离线/翻页后仍可见 ===
export function loadFavorites(): Article[] {
  const v2 = safeParse<Article[] | null>(localStorage.getItem(K.favs), null);
  if (v2) return v2;
  // 兼容旧版本：仅存 id 的数据迁移为空列表（无法还原 article，清掉）
  const legacy = localStorage.getItem(K.favsLegacy);
  if (legacy) localStorage.removeItem(K.favsLegacy);
  return [];
}

export function saveFavorites(list: Article[]) {
  localStorage.setItem(K.favs, JSON.stringify(list));
}

// === Daily read count ===
export interface ReadState { date: string; count: number }

export function loadReadState(): ReadState {
  const today = new Date().toDateString();
  const s = safeParse<ReadState | null>(localStorage.getItem(K.read), null);
  if (s && s.date === today) return s;
  const fresh = { date: today, count: 0 };
  localStorage.setItem(K.read, JSON.stringify(fresh));
  return fresh;
}

export function saveReadCount(count: number) {
  localStorage.setItem(K.read, JSON.stringify({ date: new Date().toDateString(), count }));
}
