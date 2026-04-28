import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const info: Record<string, unknown> = {};

  info['has_process'] = typeof process !== 'undefined';
  info['has_process_env'] = typeof process !== 'undefined' && typeof process.env !== 'undefined';

  // 列出 process.env 中所有以 DEEPSEEK 开头的变量
  try {
    const deepseekKeys: Record<string, string> = {};
    if (typeof process !== 'undefined' && process.env) {
      for (const key of Object.keys(process.env)) {
        if (key.includes('DEEPSEEK') || key.includes('deepseek')) {
          deepseekKeys[key] = process.env[key] ? `***${process.env[key]!.slice(-4)}` : '(empty)';
        }
      }
      info['process_env_key_count'] = Object.keys(process.env).length;
      info['process_env_keys_sample'] = Object.keys(process.env).slice(0, 20);
    }
    info['deepseek_keys_in_process_env'] = deepseekKeys;
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

      const deepseekCloudflareKeys: Record<string, string> = {};
      for (const key of envKeys) {
        if (key.includes('DEEPSEEK') || key.includes('deepseek')) {
          const val = (ctx.env as Record<string, string>)[key];
          deepseekCloudflareKeys[key] = val ? `***${val.slice(-4)}` : '(empty)';
        }
      }
      info['deepseek_keys_in_cloudflare_env'] = deepseekCloudflareKeys;
    }
  } catch (e) {
    info['cloudflare_context_error'] = String(e);
  }

  // 直接读取 process.env.DEEPSEEK_API_KEY
  try {
    const directKey = process.env.DEEPSEEK_API_KEY;
    info['direct_process_env_DEEPSEEK_API_KEY'] = directKey ? `***${directKey.slice(-4)}` : '(empty)';
  } catch (e) {
    info['direct_read_error'] = String(e);
  }

  return NextResponse.json(info);
}
