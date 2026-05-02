/**
 * Cloudflare KV 点击计数工具。
 *
 * 在生产环境（wrangler deploy 后）通过 getCloudflareContext().env 访问 KV。
 * 本地开发（next dev）通过 initOpenNextCloudflareForDev() 初始化后也可访问。
 * 如果 KV 不可用（如纯 next dev 未配置），优雅降级返回 0。
 */

const KV_BINDING_NAME = 'RESEARCH_TRACKER_KV';
const KEY_PREFIX = 'click:';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KVNamespace = any;

async function getKV(): Promise<KVNamespace | null> {
  try {
    // 动态 import，避免 top-level 在非 Cloudflare 环境中报错
    const { getCloudflareContext } = await import(
      '@opennextjs/cloudflare'
    );
    const ctx = await getCloudflareContext({ async: true });
    // RESEARCH_TRACKER_KV 是 kv_namespaces 绑定，在 CloudflareEnv 上不存在静态定义，用 any 绕过
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kv = (ctx.env as Record<string, KVNamespace>)[KV_BINDING_NAME];
    return kv ?? null;
  } catch {
    return null;
  }
}

export async function getClickCount(articleId: string): Promise<number> {
  try {
    const kv = await getKV();
    if (!kv) return 0;
    const val = await kv.get(`${KEY_PREFIX}${articleId}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementClickCount(
  articleId: string,
): Promise<number> {
  try {
    const kv = await getKV();
    if (!kv) return 0;
    const key = `${KEY_PREFIX}${articleId}`;
    // KV 没有原子自增，先读后写
    const old = await kv.get(key);
    const newVal = (old ? parseInt(old, 10) : 0) + 1;
    await kv.put(key, String(newVal));
    return newVal;
  } catch {
    return 0;
  }
}

/**
 * 批量获取点击计数。
 * KV 没有真正的批量 get API，但我们用 Promise.all 并发请求。
 */
export async function getClickCounts(
  articleIds: string[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  try {
    const kv = await getKV();
    if (!kv) return result;
    const entries = await Promise.allSettled(
      articleIds.map(
        (id) => kv.get(`${KEY_PREFIX}${id}`) as Promise<string | null>,
      ),
    );
    articleIds.forEach((id, i) => {
      const entry = entries[i];
      if (entry.status === 'fulfilled' && entry.value) {
        result[id] = parseInt(entry.value, 10);
      }
    });
  } catch {
    // ignore
  }
  return result;
}
