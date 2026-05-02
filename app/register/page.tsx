'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('请填写所有字段');
      return;
    }
    if (password !== confirm) {
      setError('两次密码不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    setLoading(true);
    const result = registerUser(email.trim(), name.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">注册账号</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">创建你的 Research Tracker 账号</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">姓名</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="confirm">确认密码</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再次输入密码" className="mt-1" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            已有账号？<Link href="/login" className="text-primary hover:underline">登录</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
