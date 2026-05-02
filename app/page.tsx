import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import HotTags from '@/components/HotTags';
import TrendChart from '@/components/TrendChart';
import TrendingList from '@/components/TrendingList';
import { getTrendingArticles } from '@/lib/search';

const CATEGORIES = [
  { slug: 'ai', name: '人工智能', icon: '🤖', color: 'from-blue-500 to-cyan-500' },
  { slug: 'biomedicine', name: '生物医药', icon: '🧬', color: 'from-green-500 to-teal-500' },
  { slug: 'energy', name: '新能源', icon: '⚡', color: 'from-yellow-500 to-orange-500' },
  { slug: 'materials', name: '材料科学', icon: '🔬', color: 'from-purple-500 to-pink-500' },
  { slug: 'quantum', name: '量子科技', icon: '⚛️', color: 'from-indigo-500 to-violet-500' },
  { slug: 'robotics', name: '机器人', icon: '🦾', color: 'from-red-500 to-rose-500' },
];

export default async function HomePage() {
  // 服务端获取热门数据
  const [hotPapers, latestPapers] = await Promise.all([
    getTrendingArticles(undefined, 'month'),
    getTrendingArticles('ai', 'week'),
  ]);

  return (
    <div>
      {/* Hero 搜索横幅 */}
      <section className="bg-gradient-to-br from-primary via-primary-dark to-secondary py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-white text-2xl md:text-4xl font-bold mb-3 tracking-wide">
            科研与行业发展动态追踪
          </h1>
          <p className="text-white/80 text-sm md:text-base mb-8 max-w-xl mx-auto">
            实时搜索全球科研论文与行业报道，智能总结核心内容，洞察技术前沿趋势
          </p>
          <SearchBar variant="hero" />
          <div className="mt-6">
            <HotTags />
          </div>
        </div>
      </section>

      {/* 双栏动态区 */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 热门报道 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-secondary font-bold text-lg flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded inline-block" />
                热门报道
              </h2>
              <Link href="/trending" className="text-sm text-primary hover:text-primary-dark transition-colors">
                更多 &gt;
              </Link>
            </div>
            <TrendingList articles={hotPapers.slice(0, 8)} showRank={true} />
          </div>

          {/* 最新文献 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-secondary font-bold text-lg flex items-center gap-2">
                <span className="w-1 h-5 bg-secondary rounded inline-block" />
                最新文献
              </h2>
              <Link href="/search?q=artificial+intelligence&sort=date" className="text-sm text-primary hover:text-primary-dark transition-colors">
                更多 &gt;
              </Link>
            </div>
            <TrendingList articles={latestPapers.slice(0, 8)} showRank={false} />
          </div>

          {/* 技术热度趋势 */}
          <div className="mt-8">
            <TrendChart />
          </div>
        </div>
      </section>

      {/* 快捷领域入口 */}
      <section className="bg-bg-light py-10">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-secondary font-bold text-lg text-center mb-6">
            按领域浏览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="group relative overflow-hidden rounded-lg bg-white border border-border hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className={`h-1.5 bg-gradient-to-r ${cat.color}`} />
                <div className="p-4 text-center">
                  <span className="text-3xl mb-2 block">{cat.icon}</span>
                  <span className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
