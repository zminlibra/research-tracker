'use client';

import { useState, useEffect } from 'react';
import {
  translateToChineseClient,
  getClientApiKey,
  saveClientApiKey,
  clearClientApiKey,
} from '@/lib/ai-client';

interface ArticleTranslationProps {
  text: string;
}

export default function ArticleTranslation({ text }: ArticleTranslationProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // 检查是否已配置 API Key
  useEffect(() => {
    setHasKey(!!getClientApiKey());
  }, []);

  async function handleTranslate() {
    if (!hasKey) {
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await translateToChineseClient(text);
      if (result) {
        setTranslation(result);
      } else {
        setError('翻译结果为空，请稍后重试');
      }
    } catch (e) {
      const msg = String(e);
      if (msg.includes('NO_API_KEY')) {
        setHasKey(false);
        setShowKeyInput(true);
      } else if (msg.includes('DEEPSEEK_QUOTA_EXHAUSTED') || msg.includes('402')) {
        setError('API 额度不足，请前往 platform.deepseek.com 充值');
      } else if (msg.includes('401')) {
        setError('API Key 无效');
        clearClientApiKey();
        setHasKey(false);
      } else {
        setError('翻译失败: ' + msg.slice(0, 80));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSaveKey() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    saveClientApiKey(trimmed);
    setHasKey(true);
    setShowKeyInput(false);
    setApiKeyInput('');
    setError(null);
  }

  // API Key 输入
  if (showKeyInput) {
    return (
      <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-6 mb-8">
        <h3 className="text-secondary font-bold text-lg mb-2">设置 DeepSeek API Key</h3>
        <p className="text-text-muted text-sm mb-4">
          翻译功能需要 DeepSeek API Key（获取地址：
          <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">platform.deepseek.com/api_keys</a>
          ）。Key 仅保存在浏览器中。
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
            placeholder="粘贴 API Key..."
            className="flex-1 px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <button
            onClick={handleSaveKey}
            disabled={!apiKeyInput.trim()}
            className="px-4 py-2 bg-primary text-white rounded text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  // 已翻译
  if (translation) {
    return (
      <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-6 mb-8">
        <h2 className="text-secondary font-bold text-lg mb-3 flex items-center gap-2">
          <span>中文翻译</span>
          <span className="text-xs font-normal text-text-muted bg-blue-100 px-2 py-0.5 rounded">自动翻译</span>
        </h2>
        <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
          {translation}
        </p>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-6 mb-8">
        <h2 className="text-secondary font-bold text-lg mb-3 flex items-center gap-2">
          <span>中文翻译</span>
          <span className="text-xs font-normal text-text-muted bg-blue-100 px-2 py-0.5 rounded">自动翻译</span>
        </h2>
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <span className="animate-spin">⏳</span>
          正在翻译...
        </div>
      </div>
    );
  }

  // 初始状态：翻译按钮
  return (
    <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-6 mb-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <h2 className="text-secondary font-bold text-lg mb-3">中文翻译</h2>
      <p className="text-text-muted text-sm mb-3">
        使用 AI 将内容摘要翻译为中文，便于快速阅读
      </p>
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
      >
        <span>🌐</span>
        翻译为中文
      </button>
    </div>
  );
}
