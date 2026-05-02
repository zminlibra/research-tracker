import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-secondary mb-8">关于本站</h1>

      <section className="bg-white rounded-lg border border-border p-6 mb-6">
        <h2 className="text-lg font-bold text-secondary mb-3">ResearchTracker 是什么？</h2>
        <p className="text-text-secondary leading-relaxed text-sm">
          ResearchTracker 是一个科研与行业发展动态追踪平台。输入你感兴趣的关键词，
          平台会实时从全球多个数据源（arXiv、OpenAlex、PubMed、IEEE、Hacker News 等）
          抓取相关的最新论文、新闻报道和行业动态，并对内容进行智能总结和洞察分析。
        </p>
      </section>

      <section className="bg-white rounded-lg border border-border p-6 mb-6">
        <h2 className="text-lg font-bold text-secondary mb-3">核心功能</h2>
        <ul className="space-y-3 text-sm text-text-secondary">
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold mt-0.5">🔍</span>
            <span><strong>实时搜索</strong>：输入关键词，同时检索学术论文、新闻报道和行业动态</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold mt-0.5">🤖</span>
            <span><strong>AI 智能总结</strong>：对文章内容进行自动摘要，提炼核心要点和深度见解</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold mt-0.5">🔥</span>
            <span><strong>热门排行</strong>：按点击量展示最受关注的科研与行业动态</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold mt-0.5">📂</span>
            <span><strong>领域分类</strong>：按人工智能、生物医药、新能源等领域浏览相关内容</span>
          </li>
        </ul>
      </section>

      <section className="bg-white rounded-lg border border-border p-6 mb-6">
        <h2 className="text-lg font-bold text-secondary mb-3">数据来源</h2>
        <ul className="text-sm text-text-secondary space-y-1.5">
          <li><strong>arXiv</strong> — 全球最大的学术预印本平台</li>
          <li><strong>OpenAlex</strong> — 开放学术元数据（覆盖 2 亿+ 论文）</li>
          <li><strong>PubMed</strong> — 生物医学文献数据库</li>
          <li><strong>IEEE Xplore</strong> — 工程技术文献库</li>
          <li><strong>Hacker News</strong> — 全球科技社区热门讨论</li>
          <li><strong>Reddit</strong> — r/science、r/technology 等科技板块</li>
        </ul>
      </section>

      <section className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold text-secondary mb-3">关于 AI 洞察</h2>
        <p className="text-text-secondary leading-relaxed text-sm">
          平台内置了基于规则的智能摘要功能，可以对文章内容进行初步分析。
          如需更深入的 AI 洞察，可以配置 Claude API Key 来启用大语言模型驱动的深度分析。
        </p>
      </section>

      <div className="mt-8 text-center">
        <Link href="/" className="inline-block px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors">
          返回首页
        </Link>
      </div>
    </div>
  );
}
