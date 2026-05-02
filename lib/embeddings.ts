/**
 * OpenAI 嵌入向量工具（客户端使用，Key 由用户自行提供）。
 *
 * 当用户在设置页填入 OpenAI API Key 后，
 * 可对搜索 Query 和文献摘要生成嵌入向量，
 * 用于语义相似度搜索（余弦相似度）。
 *
 * 向量缓存在 IndexedDB（持久化，跨会话），
 * 同时维护内存缓存（快速读取）。
 */

import type { Article } from './types';

const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const EMBED_MODEL = 'text-embedding-3-small';
const CACHE_DB_NAME = 'research-tracker-embeddings';
const CACHE_DB_VERSION = 1;
const CACHE_STORE_NAME = 'embeddings';

// ─── 内存缓存（热数据，进程重启即丢失）─────────────────
const memCache = new Map<string, number[]>();

// ─── IndexedDB 工具 ────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFromIDB(key: string): Promise<number[] | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
    const store = tx.objectStore(CACHE_STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      const result = req.result as { key: string; embedding: number[] } | undefined;
      resolve(result?.embedding ?? null);
    };
    req.onerror = () => resolve(null);
  });
}

async function saveToIDB(key: string, embedding: number[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(CACHE_STORE_NAME);
    store.put({ key, embedding, ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// ─── 嵌入向量生成 ─────────────────────────────────────────

/**
 * 获取用户的 OpenAI API Key（从 localStorage 读取）。
 */
export function getOpenAIKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('openai_api_key') || '';
  } catch {
    return '';
  }
}

export function saveOpenAIKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('openai_api_key', key.trim());
  } catch { /* ignore */ }
}

export function clearOpenAIKey(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('openai_api_key');
  } catch { /* ignore */ }
}

export function hasOpenAIKey(): boolean {
  return getOpenAIKey().length > 0;
}

/**
 * 为文本生成嵌入向量。
 * 优先读缓存，未命中才调用 API。
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const key = `emb:${text.slice(0, 200)}`;
  // 内存缓存
  const memHit = memCache.get(key);
  if (memHit) return memHit;

  // IndexedDB 缓存
  const idbHit = await getFromIDB(key);
  if (idbHit) {
    memCache.set(key, idbHit);
    return idbHit;
  }

  // 调用 API
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error('NO_OPENAI_KEY');

  const response = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text.slice(0, 8000), // API 限制
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    if (response.status === 429) throw new Error('OPENAI_QUOTA_EXHAUSTED');
    throw new Error(`OpenAI API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const embedding: number[] = data.data?.[0]?.embedding;
  if (!embedding) throw new Error('Invalid embedding response');

  // 写入缓存
  memCache.set(key, embedding);
  await saveToIDB(key, embedding);

  return embedding;
}

// ─── 余弦相似度 ─────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * 为文章生成嵌入向量（基于标题 + 摘要前 2000 字符）。
 * 结果直接挂到 article 对象上（扩展字段，不修改类型定义）。
 */
export async function embedArticle(article: Article): Promise<number[] | null> {
  try {
    const text = `${article.title}. ${article.summary}`.slice(0, 4000);
    return await getEmbedding(text);
  } catch {
    return null;
  }
}

/**
 * 计算 Query 与一批文章的语义相似度得分（0~1）。
 * 若用户未配置 OpenAI Key，返回 null（调用方降级为关键词评分）。
 */
export async function semanticSearchScore(
  query: string,
  articles: Article[]
): Promise<Map<string, number> | null> {
  try {
    const queryEmb = await getEmbedding(query);
    const scores = new Map<string, number>();

    // 并发为所有文章生成嵌入（带限流：每批最多 5 个）
    const batchSize = 5;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const embPromises = batch.map((a) =>
        embedArticle(a).then((emb) => ({ id: a.id, emb }))
      );
      const results = await Promise.all(embPromises);
      for (const r of results) {
        if (r.emb) {
          scores.set(r.id, cosineSimilarity(queryEmb, r.emb));
        }
      }
    }

    return scores;
  } catch {
    return null;
  }
}
