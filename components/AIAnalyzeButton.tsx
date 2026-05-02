'use client';

import { useState } from 'react';
import { generateInsight, getClientApiKey, saveClientApiKey, clearClientApiKey } from '@/lib/ai-client';
import type { AIInsight as AIInsightType } from '@/lib/types';
import AIInsight from '@/components/AIInsight';

interface AIAnalyzeButtonProps {
  title: string;
  abstract: string;
  sourceType: string;
}

export default function AIAnalyzeButton({ title, abstract, sourceType }: AIAnalyzeButtonProps) {
  const [insight, setInsight] = useState<AIInsightType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(() => !!getClientApiKey());

  async function handleAnalyze() {
    if (!hasKey) {
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateInsight(title, abstract);
      setInsight(result);
    } catch (e) {
      const msg = String(e);
      if (msg.includes('NO_API_KEY')) {
        setHasKey(false);
        setShowKeyInput(true);
        setError('请先设置 DeepSeek API Key');
      } else if (msg.includes('DEEPSEEK_QUOTA_EXHAUSTED') || msg.includes('402')) {
        setError('API 额度不足，请前往 platform.deepseek.com 充值');
      } else if (msg.includes('401')) {
        setError('API Key 无效，请检查后重新设置');
        clearClientApiKey();
        setHasKey(false);
      } else {
        setError('AI 分析失败: ' + msg.slice(0, 100));
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

  function handleResetKey() {
    clearClientApiKey();
    setHasKey(false);
    setApiKeyInput('');
    setShowKeyInput(true);
    setInsight(null);
    setError(null);
  }

  // 已有分析结果
  if (insight) {
    return (
      <div className="mb-8">
        <AIInsight insight={insight} />
        <div className="text-center mt-4">
          <button
            onClick={handleResetKey}
            className="text-text-muted text-xs underline hover:text-text-secondary"
          >
            更换 API Key
          </button>
        </div>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="mb-8">
        <AIInsight insight={{ summary: '', coreContribution: '', methodology: '', keyResults: '', keyTakeaways: '', limitations: '', deepInsights: '' }} loading={true} />
      </div>
    );
  }

  // API Key 输入界面
  if (showKeyInput) {
    return (
      <div className="mb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        <div className="bg-gradient-to-r from-accent/20 to-white rounded-lg border border-accent/30 p-6">
          <h3 className="text-secondary font-bold text-lg mb-2">设置 DeepSeek API Key</h3>
          <p className="text-text-muted text-sm mb-4">
            请输入你的 DeepSeek API Key（获取地址：
            <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">platform.deepseek.com/api_keys</a>
            ）。Key 仅保存在你的浏览器中，不会上传到服务器。
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
      </div>
    );
  }

  // 默认状态
  return (
    <div className="mb-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <button
            onClick={handleAnalyze}
            className="text-red-600 text-sm underline hover:text-red-800"
          >
            重试
          </button>
        </div>
      )}
      <div className="bg-gradient-to-r from-accent/20 to-white rounded-lg border border-accent/30 p-6 text-center">
        <p className="text-text-secondary text-sm mb-4">
          使用 AI 分析这篇文章的核心发现、关键要点和深度见解
        </p>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <span>🤖</span>
          AI 分析
        </button>
        <p className="text-text-muted text-xs mt-3">
          由 DeepSeek AI 提供分析 · 首次使用需配置 API Key
        </p>
      </div>
    </div>
  );
}
