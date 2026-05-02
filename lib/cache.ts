/**
 * 轻量级内存缓存（TTL 支持）。
 *
 * 用于在服务端缓存外部 API 响应，减少重复请求和 API 限流风险。
 * 部署到 Cloudflare Workers 后，每个实例有独立的内存缓存；
 * 如需跨实例共享，可后续迁移到 Cloudflare KV。
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // Unix timestamp (ms)
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * 生成标准化的缓存 key。
 * 将查询参数对象序列化为确定性的字符串。
 */
export function makeCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('&');
  return `${prefix}:${sorted}`;
}

/**
 * 读取缓存。命中且未过期时返回数据，否则返回 null。
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * 写入缓存。
 * ttlMs：存活时间（毫秒），默认 30 分钟。
 */
export function setCached<T>(key: string, data: T, ttlMs = 30 * 60 * 1000): void {
  // 简单防御：防止缓存无限增长
  if (cache.size > 500) {
    // 删除最早过期的 50 条
    const entries = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (let i = 0; i < Math.min(50, entries.length); i++) {
      cache.delete(entries[i][0]);
    }
  }

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  } as CacheEntry<unknown>);
}

/**
 * 清除所有缓存（用于测试或手动刷新）。
 */
export function clearCache(): void {
  cache.clear();
}
