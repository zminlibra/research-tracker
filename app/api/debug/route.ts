import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const info: Record<string, unknown> = {};

  // 1. 检查 process.env 是否存在
  info['has_process'] = typeof process !== 'undefined';
  info['has_process_env'] = typeof process !== 'undefined' && typeof process.env !== 'undefined';

  // 2. 列出 process.env 中所有以 GEMINI 开头的变量
  try {
    const geminiKeys: Record<string, string> = {};
    if (typeof process !== 'undefined' && process.env) {
      for (const key of Object.keys(process.env)) {
        if (key.includes('GEMINI') || key.includes('gemini')) {
          geminiKeys[key] = process.env[key] ? `***${process.env[key]!.slice(-4)}` : '(empty)';
        }
      }
      // 也列出所有 key 的数量
      info['process_env_key_count'] = Object.keys(process.env).length;
      // 列出前 20 个 key
      info['process_env_keys_sample'] = Object.keys(process.env).slice(0, 20);
    }
    info['gemini_keys_in_process_env'] = geminiKeys;
  } catch (e) {
    info['process_env_error'] = String(e);
  }

  // 3. 尝试 getCloudflareContext
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });

    info['has_cloudflare_context'] = true;
    info['has_cloudflare_env'] = !!ctx.env;

    if (ctx.env) {
      const envKeys = Object.keys(ctx.env);
      info['cloudflare_env_key_count'] = envKeys.length;
      info['cloudflare_env_keys'] = envKeys;

      const geminiCloudflareKeys: Record<string, string> = {};
      for (const key of envKeys) {
        if (key.includes('GEMINI') || key.includes('gemini')) {
          const val = (ctx.env as Record<string, string>)[key];
          geminiCloudflareKeys[key] = val ? `***${val.slice(-4)}` : '(empty)';
        }
      }
      info['gemini_keys_in_cloudflare_env'] = geminiCloudflareKeys;
    }
  } catch (e) {
    info['cloudflare_context_error'] = String(e);
  }

  // 4. 尝试 process.env.GEMINI_API_KEY 直接读取
  try {
    const directKey = process.env['GEMINI_API_KEY'];
    info['direct_process_env_GEMINI_API_KEY'] = directKey ? `***${(directKey as string).slice(-4)}` : '(empty)';
  } catch (e) {
    info['direct_read_error'] = String(e);
  }

  return NextResponse.json(info);
}
