/**
 * ChatWithPaper API — 与论文对话（流式输出）
 *
 * POST /api/chat-with-paper
 * Body: { articleId: string, articleUrl: string, summary: string, messages: { role, content }[] }
 * Response: ReadableStream (text/event-stream)
 */

import type { NextRequest } from 'next/server';
import { getPaperContext } from '@/lib/fulltext-fetcher';

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * 从 articleId 尝试获取更多上下文
 */
async function getArticleContext(
  articleId: string,
  articleUrl: string,
  summary: string
): Promise<{ context: string; isFullText: boolean }> {
  try {
    return await getPaperContext(articleId, articleUrl, summary);
  } catch {
    return { context: summary, isFullText: false };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { articleId, articleUrl, summary, messages } = body;

    if (!articleId || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 获取论文上下文（全文或摘要）
    const { context, isFullText } = await getArticleContext(
      articleId,
      articleUrl || '',
      summary || ''
    );

    // 构建消息列表（system + 历史对话）
    const systemPrompt = `你是一个专业的学术助手。请基于以下论文内容回答用户的问题。

【论文内容】(${isFullText ? '全文' : '摘要'})：
${context}

要求：
1. 回答必须基于论文内容，不得编造。
2. 使用中文回答，专业术语可保留英文。
3. 如果论文中没有相关信息，明确告知用户。
4. 回答要准确、简洁，突出关键信息。`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // 获取 API Key（从请求头或环境变量）
    const apiKey = req.headers.get('X-DeepSeek-Key') || process.env.DEEPSEEK_API_KEY || '';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'NO_API_KEY' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 调用 DeepSeek（流式）
    const dsResponse = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!dsResponse.ok) {
      const errText = await dsResponse.text().catch(() => 'Unknown error');
      return new Response(
        JSON.stringify({ error: `DeepSeek API ${dsResponse.status}: ${errText}` }),
        { status: dsResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 将 DeepSeek 的 SSE 流转换为标准 SSE 响应
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 处理 DeepSeek 流式响应
    (async () => {
      try {
        const reader = dsResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              await writer.write(encoder.encode('data: [DONE]\n\n'));
              await writer.close();
              return;
            }

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                // 将内容块转发给前端
                const payload = JSON.stringify({ content });
                await writer.write(encoder.encode(`data: ${payload}\n\n`));
              }
            } catch { /* ignore malformed chunks */ }
          }
        }
        await writer.close();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        const payload = JSON.stringify({ error: errMsg });
        await writer.write(encoder.encode(`data: ${payload}\n\n`));
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '服务器内部错误';
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
