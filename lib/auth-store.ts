// ─── localStorage 用户认证 ────────────────────────────────
'use client';

import type { Article } from './types';

const AUTH_KEY = 'rt-auth-user';
const USERS_KEY = 'rt-users';
const HISTORY_KEY = 'rt-read-history';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  favorites: string[];
  notifyEmail: string;
  notifyKeywords: string[];
  notifyFrequency: 'daily' | 'weekly';
  notifyEnabled: boolean;
}

export interface ReadHistoryEntry {
  article: Article;
  viewedAt: string;
}

// ─── 安全读取 localStorage（避免 SSR/Cloudflare 环境下崩溃）───
function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch { /* 忽略写入失败 */ }
}

function safeRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch { /* 忽略 */ }
}

// ─── 简单哈希（仅防君子，不做真正加密）───────────────────────
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
}

// ─── 获取所有注册用户 ────────────────────────────────────────
function getUsers(): StoredUser[] {
  try {
    const raw = safeGet(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── 保存所有注册用户 ────────────────────────────────────────
function saveUsers(users: StoredUser[]): void {
  safeSet(USERS_KEY, JSON.stringify(users));
}

// ─── 用户注册 ───────────────────────────────────────────────
export function registerUser(
  email: string, name: string, password: string
): { ok: true } | { ok: false; error: string } {
  try {
    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: '该邮箱已被注册' };
    }
    const newUser: StoredUser = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
      email: email.toLowerCase(),
      name,
      createdAt: new Date().toISOString(),
      favorites: [],
      notifyEmail: '',
      notifyKeywords: [],
      notifyFrequency: 'weekly',
      notifyEnabled: false,
    };
    const pwHash = hashPassword(password);
    users.push(newUser);
    saveUsers(users);
    safeSet(`rt-pw-${email.toLowerCase()}`, pwHash);
    safeSet(AUTH_KEY, JSON.stringify(newUser));
    return { ok: true };
  } catch {
    return { ok: false, error: '注册失败，请重试' };
  }
}

// ─── 用户登录 ───────────────────────────────────────────────
export function loginUser(
  email: string, password: string
): { ok: true; user: StoredUser } | { ok: false; error: string } {
  try {
    const users = getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { ok: false, error: '用户不存在' };
    const pwHash = safeGet(`rt-pw-${email.toLowerCase()}`);
    if (!pwHash || hashPassword(password) !== pwHash) {
      return { ok: false, error: '密码错误' };
    }
    safeSet(AUTH_KEY, JSON.stringify(user));
    return { ok: true, user };
  } catch {
    return { ok: false, error: '登录失败，请重试' };
  }
}

// ─── 获取当前用户 ────────────────────────────────────────────
export function getCurrentUser(): StoredUser | null {
  try {
    const raw = safeGet(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── 更新用户信息 ────────────────────────────────────────────
export function updateUser(user: StoredUser): void {
  try {
    safeSet(AUTH_KEY, JSON.stringify(user));
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
      saveUsers(users);
    }
  } catch { /* ignore */ }
}

// ─── 登出 ───────────────────────────────────────────────────
export function logoutUser(): void {
  safeRemove(AUTH_KEY);
}

// ─── 收藏功能 ───────────────────────────────────────────────
export function getFavorites(): string[] {
  return getCurrentUser()?.favorites || [];
}

export function isFavorited(articleId: string): boolean {
  return getFavorites().includes(articleId);
}

export function addFavorite(articleId: string): void {
  const user = getCurrentUser();
  if (!user) return;
  if (!user.favorites.includes(articleId)) {
    user.favorites.push(articleId);
    updateUser(user);
  }
}

export function removeFavorite(articleId: string): void {
  const user = getCurrentUser();
  if (!user) return;
  user.favorites = user.favorites.filter((id) => id !== articleId);
  updateUser(user);
}

// ─── 阅读历史 ───────────────────────────────────────────────
export function addToHistory(article: Article): void {
  try {
    const raw = safeGet(HISTORY_KEY);
    const history: ReadHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = history.filter((h) => h.article.id !== article.id);
    filtered.unshift({ article, viewedAt: new Date().toISOString() });
    const trimmed = filtered.slice(0, 50);
    safeSet(HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function getHistory(): ReadHistoryEntry[] {
  try {
    const raw = safeGet(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearHistory(): void {
  safeRemove(HISTORY_KEY);
}
