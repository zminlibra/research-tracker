'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, updateUser, type StoredUser } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);

  // 通知设置
  const [notifyEmail, setNotifyEmail] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    const u = getCurrentUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);
    setNotifyEmail(u.notifyEmail || '');
    setKeywords(u.notifyKeywords || []);
    setFrequency(u.notifyFrequency || 'weekly');
    setNotifyEnabled(u.notifyEnabled || false);
  }, [router]);

  if (!mounted || !user) return null;

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || keywords.includes(kw)) return;
    setKeywords([...keywords, kw]);
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSave = async () => {
    if (notifyEnabled && !notifyEmail) {
      setSaveMsg('⚠️ 开启通知前请填写接收邮箱');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    const updated: StoredUser = {
      ...user,
      notifyEmail,
      notifyKeywords: keywords,
      notifyFrequency: frequency,
      notifyEnabled,
    };
    updateUser(updated);
    setUser(updated);

    // 同步到服务端文件（供定时任务读取）
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          notifyEmail,
          notifyKeywords: keywords,
          notifyFrequency: frequency,
          notifyEnabled,
        }),
      });
    } catch { /* 忽略 API 同步失败（用户仍可正常浏览）*/ }

    setSaving(false);
    setSaveMsg('✅ 设置已保存');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const PAGE_STYLE = {
    maxWidth: '720px', margin: '0 auto', padding: '32px 16px',
  } as const;

  return (
    <div style={PAGE_STYLE}>
      <h1 className="text-2xl font-bold mb-6">账户设置</h1>

      {/* 用户信息 */}
      <Card className="mb-6">
        <CardHeader><CardTitle>用户信息</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-lg font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 邮件通知设置 */}
      <Card className="mb-6">
        <CardHeader><CardTitle>📧 邮件通知设置</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notify-toggle"
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="notify-toggle" className="cursor-pointer">
              开启论文更新通知
            </Label>
          </div>

          {notifyEnabled && (
            <>
              <div>
                <Label>接收邮箱地址</Label>
                <Input
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="your@qq.com / your@gmail.com 等任意邮箱"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  支持任意邮箱类型（QQ / 163 / Gmail / Outlook 等）
                </p>
              </div>

              <div>
                <Label>订阅关键词</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="输入关键词，如：CRISPR"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} size="sm">添加</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {keywords.length === 0 && (
                    <span className="text-xs text-muted-foreground">尚未添加关键词</span>
                  )}
                </div>
              </div>

              <div>
                <Label>通知频率</Label>
                <div className="flex gap-2 mt-1">
                  {(['daily', 'weekly'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        frequency === f
                          ? 'bg-primary text-white border-primary'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      {f === 'daily' ? '每日' : '每周'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存设置'}
            </Button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.startsWith('⚠') ? 'text-destructive' : 'text-green-600'}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
