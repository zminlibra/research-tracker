import Link from 'next/link';
import type { Article } from '@/lib/types';
import { aggregateSearch } from '@/lib/search';

export const dynamic = 'force-dynamic';

const CATEGORY_INFO: Record<string, { name: string; description: string; keywords: string[] }> = {
  ai: { name: '人工智能', description: '大语言模型、深度学习、计算机视觉等人工智能领域的最新进展', keywords: ['artificial intelligence', 'deep learning', 'large language model'] },
  biomedicine: { name: '生物医药', description: '基因编辑、免疫治疗、新药研发等生物医药前沿动态', keywords: ['CRISPR', 'immunotherapy', 'drug discovery'] },
  energy: { name: '新能源', description: '固态电池、钙钛矿太阳能、氢能等新能源技术突破', keywords: ['solar cell', 'battery', 'nuclear fusion'] },
  materials: { name: '材料科学', description: '二维材料、超材料、MOF等新材料研究进展', keywords: ['2D materials', 'graphene', 'perovskite'] },
  quantum: { name: '量子科技', description: '量子计算、量子通信、量子传感等领域前沿', keywords: ['quantum computing', 'quantum communication'] },
  robotics: { name: '机器人', description: '人形机器人、自动驾驶、工业自动化等', keywords: ['robotics', 'autonomous driving', 'humanoid robot'] },
};

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const info = CATEGORY_INFO[slug];

  if (!info) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-text-muted text-lg mb-4">未找到该领域分类</p>
        <Link href="/" className="text-primary hover:text-primary-dark transition-colors">
          返回首页
        </Link>
      </div>
    );
  }

  const keyword = sp.q || info.keywords[0];
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    const result = await aggregateSearch(keyword, 1, 20);
    articles = result.articles;
  } catch {
    error = '数据加载失败';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 领域头部 */}
      <div className="bg-gradient-to-r from-secondary to-secondary-light rounded-lg p-6 mb-8 text-white">
        <h1 className="text-2xl font-bold mb-2">{info.name}</h1>
        <p className="text-white/80 text-sm">{info.description}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {info.keywords.map((kw) => (
            <Link
              key={kw}
              href={`/category/${slug}?q=${encodeURIComponent(kw)}`}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                keyword === kw
                  ? 'bg-white text-secondary font-medium'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {kw}
            </Link>
          ))}
        </div>
      </div>

      {/* 结果列表 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!error && articles.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-muted">暂无相关动态</p>
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <article key={article.id} className="bg-white rounded-lg border border-border hover:shadow-md transition-shadow p-5">
              <Link href={`/article/${article.id}?title=${encodeURIComponent(article.title)}&source=${encodeURIComponent(article.source)}&date=${encodeURIComponent(article.publishedDate)}&authors=${encodeURIComponent(article.authors.join(','))}&tags=${encodeURIComponent(article.tags.join(','))}&summary=${encodeURIComponent(article.summary.slice(0, 500))}&type=${encodeURIComponent(article.sourceType)}&url=${encodeURIComponent(article.url)}&clicks=${article.clickCount}`}>
                <h3 className="text-base font-semibold text-secondary hover:text-primary transition-colors mb-2 line-clamp-2 leading-snug">
                  {article.title}
                </h3>
              </Link>
              <div className="flex items-center gap-3 text-xs text-text-muted mb-2">
                <span>{article.source}</span>
                <span>{article.publishedDate}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-3">
                {article.summary}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs bg-accent text-secondary rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary-dark transition-colors"
                >
                  查看原文 ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
