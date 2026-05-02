'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getCurrentUser, logoutUser, type StoredUser } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';

const COMPARE_KEY = 'research-tracker-compare';

function CompareCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try { setCount(JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]').length); }
    catch { setCount(0); }
  }, []);
  if (count === 0) return null;
  return (
    <Link href="/compare" className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors">
      对比 ({count})
    </Link>
  );
}

function UserMenu() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(getCurrentUser());
    const handleClick = () => setOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setOpen(false);
    router.push('/');
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Link href="/login" className="hover:text-primary-dark transition-colors">登录</Link>
        <span className="text-border">|</span>
        <Link href="/register" className="hover:text-primary-dark transition-colors">注册</Link>
      </div>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs hover:text-primary-dark transition-colors"
      >
        <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-medium">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{user.name}</span>
        <span className="text-xs opacity-70">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-md shadow-lg border border-border py-1 text-sm z-50">
          <div className="px-3 py-1.5 text-muted-foreground text-xs border-b border-border truncate">
            {user.email}
          </div>
          <Link href="/history" className="block px-3 py-2 text-text-secondary hover:bg-accent hover:text-primary transition-colors">
            阅读历史
          </Link>
          <Link href="/favorites" className="block px-3 py-2 text-text-secondary hover:bg-accent hover:text-primary transition-colors">
            我的收藏
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-destructive hover:bg-destructive/5 transition-colors"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/trending', label: '热门排行' },
  { href: '/category/ai', label: '人工智能' },
  { href: '/category/biomedicine', label: '生物医药' },
  { href: '/category/energy', label: '新能源' },
  { href: '/category/materials', label: '材料科学' },
  { href: '/category/quantum', label: '量子科技' },
  { href: '/favorites', label: '我的收藏' },
  { href: '/history', label: '阅读历史' },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = pathname === '/';

  return (
    <header className="bg-primary text-white sticky top-0 z-50 shadow-md">
      {/* 顶部标识区 */}
      <div className="bg-white text-text-secondary text-sm py-1.5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Link href="/" className="text-primary font-bold text-lg tracking-wide hover:text-primary-light transition-colors">
              ResearchTracker
            </Link>
            <span className="text-text-muted text-xs ml-2 hidden sm:inline">科研与行业发展动态追踪平台</span>
          </div>
          <div className="flex gap-3 text-xs text-text-muted items-center">
            <CompareCount />
            <UserMenu />
            <span className="text-border">|</span>
            <Link href="/about" className="hover:text-primary transition-colors">关于本站</Link>
            <span className="text-border">|</span>
            <Link href="/help" className="hover:text-primary transition-colors">帮助</Link>
          </div>
        </div>
      </div>

      {/* 主导航 */}
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-12">
          {/* 桌面导航 */}
          <ul className="hidden md:flex items-center h-full text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.href} className="h-full">
                <Link
                  href={item.href}
                  className={`flex items-center h-full px-4 transition-colors ${
                    pathname === item.href
                      ? 'bg-primary-dark font-medium'
                      : 'hover:bg-primary-dark'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* 移动端汉堡菜单按钮 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white p-2"
            aria-label="菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* 桌面端搜索入口 — 首页隐藏 */}
          {!isHome && (
            <div className="hidden sm:block">
              <form action="/search" method="get" className="flex items-center">
                <input
                  type="text"
                  name="q"
                  placeholder="搜索关键词..."
                  className="px-3 py-1.5 text-sm text-text-primary bg-white rounded-l border-0 outline-none w-44 focus:w-56 transition-all placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm bg-secondary hover:bg-secondary-light text-white rounded-r transition-colors"
                >
                  搜索
                </button>
              </form>
            </div>
          )}
        </nav>

        {/* 移动端下拉菜单 */}
        {mobileOpen && (
          <ul className="md:hidden bg-primary-dark pb-3 px-2 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded text-sm ${
                    pathname === item.href ? 'bg-primary font-medium' : 'hover:bg-primary'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {/* 移动端搜索 — 首页隐藏 */}
            {!isHome && (
              <li className="pt-2">
                <form action="/search" method="get" className="flex" onSubmit={() => setMobileOpen(false)}>
                  <input
                    type="text"
                    name="q"
                    placeholder="搜索关键词..."
                    className="flex-1 px-3 py-1.5 text-sm text-text-primary bg-white rounded-l border-0 outline-none"
                  />
                  <button type="submit" className="px-3 py-1.5 text-sm bg-secondary text-white rounded-r">
                    搜索
                  </button>
                </form>
              </li>
            )}
          </ul>
        )}
      </div>
    </header>
  );
}
