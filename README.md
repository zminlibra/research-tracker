# Research Tracker

科研与行业发展动态追踪平台 — 聚合全球学术论文与科技新闻，AI 驱动的内容总结与洞察。

![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4)
![Deploy](https://img.shields.io/badge/Deploy-Cloudflare-orange)

---

## 功能特性

### 多源数据聚合
- **arXiv** — 预印本论文（实时 API）
- **OpenAlex** — 全球学术元数据（2 亿+ 论文，免费 API）
- **PubMed** — 生物医学文献（免费 API）
- **SearXNG** — 聚合 Google / Bing 的网页搜索结果
- **RSS + Hacker News** — 科技新闻与热门讨论

### AI 智能分析（客户端执行，用户自备 Key）
- 论文/新闻摘要自动生成中文总结
- 提取关键发现要点
- 深度分析：意义、关联、应用场景
- 英文摘要一键翻译成中文
- 中文搜索词自动翻译为英文关键词
- 搜索查询智能扩展（同义词、学术/新闻双通道）

### 用户体验
- 响应式设计，移动端友好
- 热门报道 + 最新文献双栏首页
- 按领域浏览（AI / 生物医药 / 新能源 / 材料 / 量子 / 机器人）
- 多维排序：相关性 / 发布时间 / 热度
- 来源过滤：仅论文 / 仅新闻 / 全部

---

## 技术架构

```
Next.js 16 (App Router, React 19)
├── 服务端组件  — 搜索聚合、页面渲染
├── 客户端组件  — AI 分析、搜索交互、Key 管理
└── API Routes  — 服务端搜索接口（可选）

AI 层（纯客户端，不消耗服务端资源）
├── lib/ai-client.ts   — DeepSeek API 调用（localStorage 读取 Key）
├── AIAnalyzeButton    — 文章 AI 分析入口
└── ArticleTranslation — 英文摘要翻译

数据源适配器
├── lib/arxiv.ts
├── lib/news.ts
└── lib/web-search.ts

部署目标：Cloudflare Workers（通过 @opennextjs/cloudflare）
```

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

### 3. 配置 AI 功能（每个用户自己操作）

本项目 **不在服务端存储任何 API Key**。AI 分析功能需要用户自行在页面上输入自己的 [DeepSeek API Key](https://platform.deepseek.com/api_keys)：

1. 在文章卡片点击「AI 分析」或「翻译摘要」
2. 首次使用时会弹出 Key 输入框
3. Key 保存在浏览器 localStorage，只作用于当前设备
4. 费用计入用户自己的 DeepSeek 账户

> ⚠️ **部署者无需配置 DEEPSEEK_API_KEY 环境变量**，留空即可。服务端不持有 Key，不产生费用。

---

## 构建与部署

### 构建（Cloudflare Workers）

```bash
npm run build
```

构建产物输出到 `.open-next/` 目录。

### 本地预览（Wrangler）

```bash
npx wrangler dev
```

### 部署到 Cloudflare

```bash
npx wrangler deploy
```

部署前确认 `wrangler.toml` 中的 `compatibility_date` 是最新的，且 `DEEPSEEK_API_KEY` 保持为空。

---

## 项目结构

```
research-tracker/
├── app/                        # Next.js App Router
│   ├── page.tsx                # 首页（Hero + 双栏动态 + 领域入口）
│   ├── search/page.tsx         # 搜索结果页
│   ├── article/[id]/page.tsx   # 文章详情页
│   ├── category/[slug]/        # 分类浏览页
│   ├── trending/page.tsx       # 热门排行榜
│   ├── about/page.tsx          # 关于
│   ├── help/page.tsx           # 帮助
│   └── api/                    # API Routes
│       ├── search/route.ts
│       ├── insight/route.ts
│       └── trending/route.ts
├── components/                 # React 客户端组件
│   ├── AIAnalyzeButton.tsx    # AI 分析按钮（含 Key 输入 UI）
│   ├── ArticleTranslation.tsx  # 摘要翻译组件（含 Key 输入 UI）
│   ├── ArticleCard.tsx        # 文章卡片
│   ├── SearchBar.tsx          # 搜索栏
│   ├── Header.tsx             # 顶部导航
│   └── Footer.tsx             # 页脚
├── lib/                       # 核心逻辑
│   ├── ai-client.ts           # 客户端 AI 调用（localStorage Key）
│   ├── ai.ts                  # 服务端 AI 调用（遗留，未使用）
│   ├── search.ts              # 搜索聚合引擎（去重 + 排序）
│   ├── arxiv.ts               # arXiv API 适配器
│   ├── news.ts                # RSS + HN 新闻源
│   └── web-search.ts          # SearXNG 网页搜索
├── data/
│   └── click-counts.json      # 点击计数（本地文件，部署后建议迁移到 KV）
├── open-next.config.ts        # Cloudflare 适配器配置
└── wrangler.toml              # Cloudflare Workers 配置
```

---

## 已知问题与改进方向

| 问题 | 说明 | 优先级 |
|------|------|--------|
| 点击计数多实例不一致 | `click-counts.json` 本地文件在 Cloudflare 多实例部署时不共享，建议迁移到 Cloudflare KV | 中 |
| `lib/ai.ts` 遗留代码 | 服务端 AI 调用已废弃，可清理 | 低 |
| arXiv XML 解析用正则 | 当前用正则解析，正常可用，但不够健壮 | 低 |

---

## License

MIT
