'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

// 动态热门词库（按领域分类，每次随机抽8个）
const TAG_POOL = [
  // AI / 大模型
  { label: '大模型', query: 'large language model' },
  { label: 'GPT-5', query: 'GPT-5' },
  { label: 'AI Agent', query: 'AI agent' },
  { label: '多模态', query: 'multimodal AI' },
  { label: 'RAG', query: 'retrieval augmented generation' },
  { label: '推理模型', query: 'reasoning model' },
  { label: 'Claude', query: 'Claude AI' },
  { label: 'Gemini', query: 'Gemini AI' },
  // 生物医药
  { label: '基因编辑', query: 'CRISPR gene editing' },
  { label: 'mRNA疫苗', query: 'mRNA vaccine' },
  { label: 'GLP-1', query: 'GLP-1 agonist' },
  { label: '阿尔兹海默', query: 'Alzheimer disease' },
  { label: '单细胞测序', query: 'single cell sequencing' },
  { label: 'ADC药物', query: 'antibody drug conjugate' },
  // 能源 / 材料
  { label: '固态电池', query: 'solid state battery' },
  { label: '核聚变', query: 'nuclear fusion' },
  { label: '氢能', query: 'hydrogen energy' },
  { label: '钙钛矿', query: 'perovskite solar cell' },
  { label: '钠离子电池', query: 'sodium ion battery' },
  // 量子 / 前沿
  { label: '量子计算', query: 'quantum computing' },
  { label: '脑机接口', query: 'brain computer interface' },
  { label: '6G', query: '6G wireless' },
  { label: '自动驾驶', query: 'autonomous driving' },
  { label: '人形机器人', query: 'humanoid robot' },
  // 合成生物学（你的方向）
  { label: '合成生物学', query: 'synthetic biology' },
  { label: '基因回路', query: 'genetic circuit' },
  { label: '路径优化', query: 'metabolic pathway optimization' },
];

function getRandomTags(count: number) {
  const shuffled = [...TAG_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function HotTags() {
  const [tags, setTags] = useState(() => getRandomTags(8));

  // 每5分钟换一批标签
  useEffect(() => {
    const timer = setInterval(() => {
      setTags(getRandomTags(8));
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {tags.map((tag) => (
        <Link key={tag.query} href={`/search?q=${encodeURIComponent(tag.query)}`}>
          <Badge
            variant="outline"
            className="cursor-pointer border-white/40 text-white hover:bg-white/15 hover:border-white/70 transition-colors text-sm py-0.5"
          >
            🔥 {tag.label}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
