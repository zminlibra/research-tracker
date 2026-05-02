import { NextResponse } from 'next/server';
import { aggregateSearch } from '@/lib/search';

interface NotifyUser {
  email: string;
  notifyKeywords: string[];
  notifyFrequency: 'daily' | 'weekly';
  notifyEnabled: boolean;
}

// 从文件系统读取订阅用户（localStorage 在服务端不可用）
function getSubscribedUsers(): NotifyUser[] {
  try {
    const fs = require('fs');
    const path = require('path');
    const storePath = path.join(process.cwd(), '.notify-store.json');
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf-8');
      const users: NotifyUser[] = JSON.parse(raw);
      return users.filter((u) => u.notifyEnabled && u.notifyEmail && u.notifyKeywords.length > 0);
    }
  } catch { /* 忽略 */ }
  return [];
}

function saveNotifyUsers(users: NotifyUser[]): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const storePath = path.join(process.cwd(), '.notify-store.json');
    fs.writeFileSync(storePath, JSON.stringify(users, null, 2));
  } catch { /* 忽略写入失败 */ }
}

// 用户设置 API（供 settings 页面调用，同步到文件）
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, notifyEmail, notifyKeywords, notifyFrequency, notifyEnabled } = body;

    if (!email) {
      return NextResponse.json({ error: '缺少用户标识' }, { status: 400 });
    }

    const users = getSubscribedUsers();
    const idx = users.findIndex((u) => u.email === email);
    const entry: NotifyUser = { email: notifyEmail || email, notifyKeywords, notifyFrequency, notifyEnabled };

    if (idx >= 0) {
      users[idx] = entry;
    } else {
      users.push(entry);
    }

    saveNotifyUsers(users);
    return NextResponse.json({ success: true, count: users.length });
  } catch (err) {
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

// 定时触发：搜索并发送通知邮件
export async function GET() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({ error: 'SMTP 未配置，请设置 SMTP_HOST / SMTP_USER / SMTP_PASS 环境变量' }, { status: 503 });
  }

  const users = getSubscribedUsers().filter((u) => u.notifyEnabled);
  const results: { email: string; sent: boolean; error?: string }[] = [];

  for (const user of users) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一...
    const isDaily = user.notifyFrequency === 'daily';
    const isWeekly = user.notifyFrequency === 'weekly' && dayOfWeek === 1; // 每周一

    if (!isDaily && !isWeekly) continue;

    try {
      // 搜索每个关键词，取最新 3 篇
      const articles = [];
      for (const kw of user.notifyKeywords.slice(0, 5)) {
        const result = await aggregateSearch(kw, 1, 3);
        articles.push(...result.articles);
      }

      if (articles.length === 0) {
        results.push({ email: user.email, sent: true, error: '无新文章' });
        continue;
      }

      // 构建 HTML 邮件
      const articleRows = articles.slice(0, 10).map((a) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">
            <a href="${a.url}" style="color:#6366f1;text-decoration:none;font-weight:500">${a.title}</a>
            <div style="font-size:12px;color:#888">${a.source} · ${a.publishedDate}</div>
          </td>
        </tr>
      `).join('');

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#333">📬 ResearchTracker · 最新文献速递</h2>
          <p style="color:#666;font-size:14px">为你推送 ${articles.length} 篇最新文献</p>
          <table style="width:100%;border-collapse:collapse">${articleRows}</table>
          <hr style="margin:20px 0;border:none;border-top:1px solid #eee" />
          <p style="font-size:12px;color:#aaa">由 ResearchTracker 自动推送 · <a href="#" style="color:#aaa">退订</a></p>
        </div>
      `;

      // 发送邮件（Node.js 内置 smtp）
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpSecure ? 465 : 587,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"ResearchTracker" <${smtpFrom}>`,
        to: user.email,
        subject: `📬 ResearchTracker · ${isDaily ? '每日' : '每周'}文献速递`,
        html,
      });

      results.push({ email: user.email, sent: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      results.push({ email: user.email, sent: false, error: msg });
    }
  }

  const sent = results.filter((r) => r.sent).length;
  return NextResponse.json({ ok: true, total: users.length, sent, results });
}
