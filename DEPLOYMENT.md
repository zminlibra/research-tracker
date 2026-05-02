# 部署与配置说明

## 1. Cloudflare KV（点击计数）

点击计数功能使用 Cloudflare KV 存储，部署前需创建 KV namespace：

### 创建 KV

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → KV
2. 点击 **Create namespace**
3. 名称填 `RESEARCH_TRACKER_KV`，点 **Add**
4. 复制生成的 **ID**

### 绑定到项目

在 `wrangler.toml` 中填入 ID：

```toml
[[kv_namespaces]]
binding = "RESEARCH_TRACKER_KV"
id = "你的 KV Namespace ID"
preview_id = "你的 KV Namespace ID"
```

### 本地开发

`wrangler dev` 或 `next dev` 会自动通过 `initOpenNextCloudflareForDev()` 连接 KV 的本地模拟。如果未配置 KV，点击计数会优雅降级返回 0。

---

## 2. 安装依赖

```bash
npm install
```

---

## 3. 邮件通知 — SMTP 配置

系统通过 SMTP 发送邮件通知。需要配置以下环境变量：

### 方式一：QQ 邮箱

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-qq@qq.com
SMTP_PASS=your-smtp授权码   # 不是 QQ 密码，在 QQ 邮箱设置 → 账户 → POP3/SMTP服务 中生成
SMTP_FROM=your-qq@qq.com
```

### 方式二：Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password   # 在 Google 账户 → 安全性 → 应用专用密码 中生成
SMTP_FROM=your-gmail@gmail.com
```

### 方式三：163 邮箱

```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-name@163.com
SMTP_PASS=your-smtp授权码
SMTP_FROM=your-name@163.com
```

### 方式四：企业邮箱

```env
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@company.com
SMTP_PASS=your-password
SMTP_FROM=your@company.com
```

---

## 4. 邮件通知 — 定时触发器

邮件通知需要定时触发。推荐使用 GitHub Actions：

```yaml
# .github/workflows/notify.yml
name: Daily Notification
on:
  schedule:
    - cron: '0 9 * * *'   # 每天 09:00 UTC
  workflow_dispatch:        # 手动触发
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST https://your-domain.vercel.app/api/notify
```

---

## 5. 构建与部署

### 构建（Cloudflare Workers）

```bash
npm run build
```

### 本地预览（Wrangler）

```bash
npx wrangler dev
```

### 部署到 Cloudflare

```bash
npx wrangler deploy
```

---

## 6. 功能汇总

| 功能 | 状态 | 说明 |
|------|------|------|
| 趋势图表（首页） | ✅ 已实现 | recharts 面积图，支持关键词切换 |
| 邮件通知订阅 | ✅ 已实现 | 用户在设置页配置关键词/邮箱/频率 |
| 通知触发 API | ⚠️ 需配置 | `/api/notify` 已创建，需配置定时触发器 |
| SMTP 发送 | ⚠️ 需配置 | 需要配置 SMTP 环境变量 |
| 点击计数（KV） | ⚠️ 需配置 | 需创建 KV namespace 并绑定 |
