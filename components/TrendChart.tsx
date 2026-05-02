'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// 预设关键词
const KEYWORDS = [
  'CRISPR',
  'mRNA vaccine',
  'AI drug discovery',
  'quantum computing',
  'synthetic biology',
];

interface TrendDataPoint {
  month: string;
  [key: string]: string | number;
}

interface TrendResponse {
  keyword: string;
  counts: { month: string; count: number }[];
}

function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }
  return months;
}

export default function TrendChart() {
  const [keywords, setKeywords] = useState<string[]>(['CRISPR', 'mRNA vaccine']);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableKeywords] = useState<string[]>(KEYWORDS);

  useEffect(() => {
    async function loadTrend() {
      setLoading(true);
      try {
        const months = getLast6Months();
        // 初始化每个月的数据
        const data: TrendDataPoint[] = months.map((m) => {
          const point: TrendDataPoint = { month: m };
          keywords.forEach((kw) => { point[kw] = 0; });
          return point;
        });

        // 对每个关键词调用搜索 API（限制每次请求）
        await Promise.all(
          keywords.map(async (kw) => {
            try {
              const res = await fetch(
                `/api/trend?keyword=${encodeURIComponent(kw)}&months=6`
              );
              if (res.ok) {
                const json: TrendResponse = await res.json();
                json.counts.forEach(({ month, count }) => {
                  const idx = data.findIndex((d) => d.month === month);
                  if (idx >= 0) data[idx][kw] = count;
                });
              }
            } catch { /* ignore */ }
          })
        );

        setTrendData(data);
      } finally {
        setLoading(false);
      }
    }
    if (keywords.length > 0) loadTrend();
  }, [keywords]);

  const toggleKeyword = (kw: string) => {
    setKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const formatMonth = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    return `${y.slice(2)}/${m}`;
  };

  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>技术热度趋势</CardTitle></CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          加载中...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base">技术热度趋势（近 6 个月）</CardTitle>
          <div className="flex flex-wrap gap-1">
            {availableKeywords.map((kw) => (
              <button
                key={kw}
                onClick={() => toggleKeyword(kw)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  keywords.includes(kw)
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                {keywords.map((_, i) => (
                  <linearGradient key={i} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip
                labelFormatter={(label) => formatMonth(label)}
                contentStyle={{ fontSize: '12px' }}
              />
              <Legend formatter={(value) => <span style={{ fontSize: '11px' }}>{value}</span>} />
              {keywords.map((kw, i) => (
                <Area
                  key={kw}
                  type="monotone"
                  dataKey={kw}
                  stroke={colors[i % colors.length]}
                  fill={`url(#color${i})`}
                  strokeWidth={2}
                  name={kw}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            暂无数据，请选择关键词
          </div>
        )}
      </CardContent>
    </Card>
  );
}
