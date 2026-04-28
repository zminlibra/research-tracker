export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 骨架屏 — 搜索横幅 */}
      <div className="bg-gradient-to-br from-primary/10 via-primary-dark/10 to-secondary/10 rounded-lg py-16 mb-8 animate-pulse" />

      {/* 骨架屏 — 双栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-3">
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* 骨架屏 — 领域入口 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
