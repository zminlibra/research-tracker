import { NextResponse } from 'next/server';

const CATEGORIES = [
  { slug: 'ai', name: '人工智能', description: '大语言模型、深度学习、计算机视觉等人工智能领域的最新进展', keywords: ['artificial intelligence', 'deep learning', 'large language model', 'computer vision'] },
  { slug: 'biomedicine', name: '生物医药', description: '基因编辑、免疫治疗、新药研发等生物医药前沿动态', keywords: ['CRISPR', 'immunotherapy', 'drug discovery', 'genomics'] },
  { slug: 'energy', name: '新能源', description: '固态电池、钙钛矿太阳能、氢能等新能源技术突破', keywords: ['solar cell', 'battery', 'hydrogen energy', 'nuclear fusion'] },
  { slug: 'materials', name: '材料科学', description: '二维材料、超材料、MOF等新材料研究进展', keywords: ['2D materials', 'metamaterial', 'graphene', 'perovskite'] },
  { slug: 'quantum', name: '量子科技', description: '量子计算、量子通信、量子传感等领域前沿', keywords: ['quantum computing', 'quantum communication', 'quantum sensing'] },
  { slug: 'robotics', name: '机器人', description: '人形机器人、自动驾驶、工业自动化等', keywords: ['robotics', 'autonomous driving', 'humanoid robot'] },
];

export async function GET() {
  return NextResponse.json({ categories: CATEGORIES });
}
