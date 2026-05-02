'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ChatWithPaperProps {
  articleId: string;
  articleUrl: string;
  summary: string;
  title: string;
}

export default function ChatWithPaper({
  articleId, articleUrl, summary, title,
}: ChatWithPaperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages([...newMessages, { role: 'assistant' as const, content: '' }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-with-paper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DeepSeek-Key': localStorage.getItem('deepseek_api_key') || '',
        },
        body: JSON.stringify({
          articleId, articleUrl, summary,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${response.status})`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

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
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const content = json.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: assistantContent };
                }
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '对话失败，请重试');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setIsOpen(true)}>
        与论文对话（AI 助手）
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <div className="text-sm font-medium">与论文对话</div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>✕</Button>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              你可以问我关于这篇论文的任何问题，例如：
              <br /><span className="text-foreground/60">"这项研究的主要创新点是什么？"</span>
              <br /><span className="text-foreground/60">"实验方法有什么局限性？"</span>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span
                className={`inline-block max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.content || (msg.role === 'assistant' && isLoading && idx === messages.length - 1
                  ? '正在思考...'
                  : msg.content)}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>

        {error && (
          <div className="px-4 py-2 text-sm text-destructive bg-destructive/5">{error}</div>
        )}

        <Separator />
        <form onSubmit={handleSubmit} className="p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>发送</Button>
        </form>
      </CardContent>
    </Card>
  );
}
