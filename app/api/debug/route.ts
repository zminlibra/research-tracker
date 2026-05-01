import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const info: Record<string, unknown> = {};

  info['has_process'] = typeof process !== 'undefined';
  info['has_process_env'] = typeof process !== 'undefined' && typeof process.env !== 'undefined';

  // 读取 process.env 基本信息
  try {
    if (typeof process !== 'undefined' && process.env) {
      info['process_env_key_count'] = Object.keys(process.env).length;
      info['process_env_keys_sample'] = Object.keys(process.env).slice(0, 20);
    }
  } catch (e) {
    info['process_env_error'] = String(e);
  }

  // 尝试 getCloudflareContext
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });

    info['has_cloudflare_context'] = true;
    info['has_cloudflare_env'] = !!ctx.env;

    if (ctx.env) {
      const envKeys = Object.keys(ctx.env);
      info['cloudflare_env_key_count'] = envKeys.length;
      info['cloudflare_env_keys'] = envKeys;
    }
  } catch (e) {
    info['cloudflare_context_error'] = String(e);
  }

  return NextResponse.json(info);
}
