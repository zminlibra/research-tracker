import { NextResponse } from 'next/server';
import { aggregateSearch } from '@/lib/search';

// ⚠️ 邮件通知功能在 Cloudflare Workers 环境中不可用。
// 原因：Cloudflare Workers 不支持 Node.js 的 fs / path / nodemailer 模块。
// 如需启用，需将后端迁移到支持 Node.js 运行时的部署平台（如 Vercel），
// 或使用 Cloudflare Email Workers / MailChannels 等替代方案。

const NOT_AVAILABLE_MSG =
  '邮件通知功能在 Cloudflare Workers 中不可用。详情请查看 app/api/notify/route.ts 中的注释说明。';

export async function GET() {
  return NextResponse.json({ error: NOT_AVAILABLE_MSG }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({ error: NOT_AVAILABLE_MSG }, { status: 503 });
}
