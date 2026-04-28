import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-secondary mb-8">使用帮助</h1>

      <section className="bg-white rounded-lg border border-border p-6 mb-6">
        <h2 className="text-lg font-bold text-secondary mb-3">如何搜索？</h2>
        <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
          <li>在首页的搜索框中输入你感兴趣的关键词（如 "quantum computing"、"基因编辑" 等）</li>
          <li>点击搜索按钮或按回车键</li>
          <li>在搜索结果页可以使用顶部的筛选栏按<strong>排序方式</strong>和<strong>来源类型</strong>过滤结果</li>
          <li>点击任意文章标题进入详情页，查看 AI 生成的总结和洞察</li>
        </ol>
      </section>

      <section className="bg-white rounded-lg border border-border p-6 mb-6">
        <h2 className="text-lg font-bold text-secondary mb-3">搜索结果类型说明</h2>
        <ul className="text-sm text-text-secondary space-y-3">
          <li className="flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />
            <span><strong>学术论文</strong>：来自 arXiv 和 Semantic Scholar 的科研论文，适合了解学术前沿</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mt-2" />
            <span><strong>新闻报道</strong>：来自 Hacker News、Reddit 等平台的科技资讯，适合了解行业动态</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full mt-2" />
            <span><strong>行业动态</strong>：来自 Science Daily 等科技媒体的行业进展报道</span>
          </li>
        </ul>
      </section>

      <section className="bg-white rounded-lg border border-border p-6 mb-6">
        <h2 className="text-lg font-bold text-secondary mb-3">搜索技巧</h2>
        <ul className="text-sm text-text-secondary space-y-2 list-disc list-inside">
          <li>使用<strong>英文关键词</strong>可以获得更多学术论文结果（arXiv 和 Semantic Scholar 主要索引英文内容）</li>
          <li>使用<strong>中文关键词</strong>可以获得更多新闻报道（Google News 支持中文搜索）</li>
          <li>尝试不同的排序方式：<strong>按热度</strong>看最受关注的内容，<strong>按时间</strong>看最新进展</li>
          <li>使用领域分类页面快速浏览特定领域的热门内容</li>
        </ul>
      </section>

      <section className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-lg font-bold text-secondary mb-3">AI 洞察功能</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          文章详情页的 AI 洞察功能会对文章内容进行自动总结和深度分析。
          默认使用基于规则的分析；配置 Claude API Key 后可获得更深入的 AI 驱动分析。
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
