export type PostCounters = {
  likes_count?: number;
  broken_hearts_count?: number;
  reposts_count?: number;
  comments_count?: number;
  updatedAt?: number;
};

const KEY = "blaze:post-updates";

type UpdateMap = Record<string, PostCounters>;

export function getUpdatesMap(): UpdateMap | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v ? (JSON.parse(v) as UpdateMap) : null;
  } catch {
    return null;
  }
}

export function recordPostUpdate(postId: string, partial: PostCounters) {
  const map = getUpdatesMap() || {};
  map[postId] = { ...map[postId], ...partial, updatedAt: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(map));
}

export function clearPostUpdates() {
  sessionStorage.removeItem(KEY);
}

export function mergePostUpdates<T extends { id: string }>(posts: T[]): T[] {
  const map = getUpdatesMap();
  if (!map) return posts;
  return posts.map((p) => {
    const upd = map[p.id];
    if (!upd) return p;
    return {
      ...p,
      likes_count: upd.likes_count ?? (p as any).likes_count,
      broken_hearts_count: upd.broken_hearts_count ?? (p as any).broken_hearts_count,
      reposts_count: upd.reposts_count ?? (p as any).reposts_count,
      comments_count: upd.comments_count ?? (p as any).comments_count,
    } as T;
  });
}
