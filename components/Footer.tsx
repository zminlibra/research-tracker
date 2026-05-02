'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-800 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 关于 */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3">ResearchTracker</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              实时追踪全球科研进展与行业发展动态，提供智能化的文献搜索、内容总结与趋势洞察服务。
            </p>
          </div>

          {/* 数据来源 */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3">数据来源</h3>
            <ul className="text-sm space-y-1.5 text-gray-400">
              <li>arXiv — 学术预印本</li>
              <li>PubMed / IEEE — 学术文献</li>
              <li>各大学术期刊与会议</li>
            </ul>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3">快速链接</h3>
            <ul className="text-sm space-y-1.5 text-gray-400">
              <li><Link href="/" className="hover:text-white transition-colors">首页</Link></li>
              <li><Link href="/trending" className="hover:text-white transition-colors">热门排行</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">关于本站</Link></li>
              <li><Link href="/help" className="hover:text-white transition-colors">使用帮助</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} ResearchTracker. All rights reserved.</p>
        </div>
      </div>

      {/* 返回顶部 */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 bg-primary text-white w-10 h-10 rounded-full shadow-lg hover:bg-primary-dark transition-colors flex items-center justify-center text-sm"
        aria-label="返回顶部"
      >
        ↑
      </button>
    </footer>
  );
}
