import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-xl font-bold text-secondary mb-2">页面未找到</h2>
      <p className="text-text-muted mb-6">您访问的页面不存在或已被移除</p>
      <Link
        href="/"
        className="inline-block px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}
