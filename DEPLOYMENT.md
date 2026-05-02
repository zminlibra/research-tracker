# 部署与配置说明

## 1. 安装新增依赖

在本地或 CI/CD 环境中运行：

```bash
cd research-tracker
npm install recharts
```

（`recharts` 已在 `package.json` 中添加）

---

## 2. 自动化通知 — SMTP 配置

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

### 方式四：QQ 企业邮箱 / 企业邮箱

```env
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@company.com
SMTP_PASS=your-password
SMTP_FROM=your@company.com
```

> **支持任意 SMTP 服务**：上述环境变量支持所有主流邮箱服务（QQ / Gmail / 163 / Outlook / 企业邮箱等），只需填入对应的 SMTP 配置即可。

---

## 3. 自动化通知 — 部署触发器（可选）

邮件通知需要定时触发。有两种方式：

### 方式 A：在 Vercel 上配置 Cron Job（推荐）

1. 在 `vercel.json` 中添加：

```json
{
  "crons": [
    {
      "path": "/api/notify",
      "schedule": "0 9 * * *"    // 每天 09:00 UTC（北京时间 17:00）执行
    }
  ]
}
```

2. 在 Vercel Dashboard → Project → Settings → Cron Jobs 中确认。

### 方式 B：使用第三方定时服务（GitHub Actions / Railway）

```yaml
# .github/workflows/notify.yml
name: Daily Notification
on:
  schedule:
    - cron: '0 9 * * *'   # 每天 09:00 UTC
  workflow_dispatch:        # 也支持手动触发
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST https://your-domain.vercel.app/api/notify
```

---

## 4. Vercel 部署

```bash
npm i -g vercel
vercel deploy
```

在 Vercel Dashboard 设置环境变量（SMTP 配置）。

---

## 5. 功能汇总

| 功能 | 状态 | 说明 |
|------|------|------|
| 趋势图表（首页） | ✅ 已实现 | recharts 面积图，支持关键词切换 |
| 邮件通知订阅 | ✅ 已实现 | 用户在设置页配置关键词/邮箱/频率 |
| 通知触发 API | ⚠️ 需部署 | `/api/notify` 已创建，需配置 Cron Job |
| SMTP 发送 | ⚠️ 需配置 | 需要配置环境变量（参考上方）|
