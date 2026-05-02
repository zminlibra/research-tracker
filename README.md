# 🔬 Research Tracker

科研与行业发展动态追踪平台 — 聚合全球学术论文与科技新闻，AI 驱动的内容总结与洞察。

[![GitHub Release](https://img.shields.io/github/v/release/zminlibra/research-tracker?include_prereleases&label=release&color=blue)](https://github.com/zminlibra/research-tracker/releases)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![Deploy](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-orange?logo=cloudflare)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ 功能特性

### 📚 多源数据聚合
| 数据源 | 类型 | 说明 |
|--------|------|------|
| 🔬 **arXiv** | 预印本论文 | 实时 API，数理化 + CS + AI |
| 📖 **OpenAlex** | 学术元数据 | 2 亿+ 论文索引，免费开放 API |
| 🧬 **PubMed** | 生物医学 | NCBI 官方 API，生物医学/临床文献 |
| 🔍 **SearXNG** | 网页搜索 | 聚合 Google / Bing / Wikipedia 等 |
| 📡 **RSS + HN** | 科技新闻 | 顶级科技门户 + Hacker News 热门 |

### 🤖 AI 智能分析（客户端执行，用户自备 Key）
- 📝 论文 / 新闻摘要自动生成中文总结
- 💡 提取关键发现要点与核心论点
- 🔗 深度分析：研究意义、学术关联、应用场景
- 🌐 英文摘要一键翻译成中文
- 🔄 中文搜索词自动翻译为英文关键词
- 📊 搜索查询智能扩展（同义词、学术 / 新闻双通道）
- 💬 **论文对话**：与论文全文进行多轮问答

### 👤 用户系统
- 🔐 注册 / 登录（本地账号系统）
- ⭐ 收藏文章，随时回顾
- 📖 阅读历史自动记录
- ⚖️ 多篇文章对比分析
- 📬 邮件通知订阅（关键词匹配时自动推送）
- 🎨 个性化设置（通知偏好、界面定制）

### 📊 数据可视化
- 📈 研究趋势图表（recharts 面积图）
- 🔥 热门标签词云 + 刷新
- 🏷️ 按领域浏览：AI / 生物医药 / 新能源 / 材料 / 量子 / 机器人

### 🎯 用户体验
- 📱 响应式设计，移动端友好
- 🔥 热门报道 + 最新文献双栏首页
- 🔍 搜索标题三级匹配 + 完全匹配置顶
- ✨ 搜索结果标题高亮匹配
- 📊 多维排序：相关性 / 发布时间 / 热度
- 🎚️ 来源过滤：仅论文 / 仅新闻 / 全部

---

## 🏗️ 技术架构

```
Next.js 16 (App Router, React 19)
├── 服务端组件     — 搜索聚合、页面渲染、API Routes
├── 客户端组件     — AI 分析、用户交互、Key 管理
├── API Routes     — 搜索 / 趋势 / 通知 / 论文对话
└── Cloudflare Workers — 边缘部署

AI 层（纯客户端，不消耗服务端资源）
├── lib/ai-client.ts       — DeepSeek API 调用（localStorage 读取 Key）
├── AIAnalyzeButton        — 文章 AI 分析入口
├── ArticleTranslation     — 英文摘要翻译
├── AIInsight              — AI 洞察面板
└── ChatWithPaper          — 论文多轮对话

数据源适配器
├── lib/fetchers/arxiv-fetcher.ts
├── lib/fetchers/openalex-fetcher.ts
├── lib/fetchers/pubmed-fetcher.ts
├── lib/fetchers/news-fetcher.ts
├── lib/fetchers/web-search-fetcher.ts
└── lib/search.ts           — 聚合引擎（去重 + 排序 + 三级匹配）

用户系统
├── app/login               — 登录页
├── app/register            — 注册页
├── app/settings            — 个人设置
├── app/favorites           — 收藏管理
├── app/history             — 阅读历史
└── app/compare             — 文章对比
```

---

## 🚀 快速开始

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

## 📦 构建与部署

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

部署前确认 `wrangler.toml` 中的 `compatibility_date` 是最新的。

---

## 📁 项目结构

```
research-tracker/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # 首页（Hero + 双栏 + 领域入口 + 趋势图）
│   ├── search/page.tsx               # 搜索结果页
│   ├── article/[id]/page.tsx         # 文章详情页
│   ├── category/[slug]/page.tsx      # 分类浏览页
│   ├── trending/page.tsx             # 热门排行榜
│   ├── compare/page.tsx              # 文章对比
│   ├── favorites/page.tsx            # 收藏管理
│   ├── history/page.tsx              # 阅读历史
│   ├── login/page.tsx                # 用户登录
│   ├── register/page.tsx             # 用户注册
│   ├── settings/page.tsx             # 个人设置
│   ├── about/page.tsx                # 关于
│   ├── help/page.tsx                 # 帮助
│   └── api/                          # API Routes
│       ├── search/route.ts           # 搜索接口
│       ├── trending/route.ts         # 热门排行
│       ├── trend/route.ts            # 趋势数据
│       ├── categories/route.ts       # 分类数据
│       ├── article/[id]/route.ts     # 文章详情
│       ├── chat-with-paper/route.ts  # 论文对话
│       └── notify/route.ts           # 邮件通知触发
├── components/                       # React 客户端组件
│   ├── AIAnalyzeButton.tsx          # AI 分析按钮（含 Key 输入 UI）
│   ├── AIInsight.tsx                # AI 洞察面板
│   ├── ArticleCard.tsx              # 文章卡片
│   ├── ArticleTranslation.tsx       # 摘要翻译（含 Key 输入 UI）
│   ├── ChatWithPaper.tsx            # 论文多轮对话
│   ├── CompareButton.tsx            # 文章对比
│   ├── FavoriteButton.tsx           # 文章收藏
│   ├── ReadingTracker.tsx           # 阅读追踪
│   ├── SearchBar.tsx                # 搜索栏
│   ├── SearchFilters.tsx            # 搜索过滤器
│   ├── HotTags.tsx                  # 热门标签
│   ├── TrendChart.tsx               # 趋势图表
│   ├── TrendingList.tsx             # 热门列表
│   ├── Header.tsx                   # 顶部导航
│   ├── Footer.tsx                   # 页脚
│   └── ui/                          # shadcn/ui 基础组件
├── lib/                             # 核心逻辑
│   ├── ai-client.ts                 # 客户端 AI 调用（localStorage Key）
│   ├── search.ts                    # 搜索聚合引擎（去重 + 排序）
│   ├── auth-store.ts               # 用户认证状态管理
│   ├── cache.ts                    # 缓存管理
│   ├── types.ts                    # 类型定义
│   ├── utils.ts                    # 工具函数
│   ├── fetchers/                   # 数据源适配器
│   │   ├── arxiv-fetcher.ts        # arXiv API
│   │   ├── openalex-fetcher.ts     # OpenAlex API
│   │   ├── pubmed-fetcher.ts       # PubMed API
│   │   ├── news-fetcher.ts         # RSS + HN 新闻
│   │   └── web-search-fetcher.ts   # SearXNG 搜索
│   ├── fulltext-fetcher.ts         # 全文获取
│   ├── embeddings.ts               # 文本向量化
│   └── kv.ts                       # Cloudflare KV（点击计数）
├── open-next.config.ts              # Cloudflare 适配器配置
└── wrangler.toml                    # Cloudflare Workers 配置
```

---

## ⚠️ 已知问题与改进方向

| 问题 | 说明 | 优先级 |
|------|------|--------|
| 点击计数需配置 KV | 需在 Cloudflare Dashboard 创建 KV namespace 并在 wrangler.toml 填入 id | 中 |
| 邮件通知需配置 Cron | `/api/notify` 已实现，需配置定时触发器（如 GitHub Actions） | 中 |
| SMTP 环境变量 | 邮件功能需配置 SMTP 相关环境变量 | 中 |

---

## 📄 License

MIT
