'use client';

import { useEffect } from 'react';
import { addToHistory } from '@/lib/auth-store';
import type { Article } from '@/lib/types';

export default function ReadingTracker({ article }: { article: Article }) {
  useEffect(() => {
    addToHistory(article);
  }, [article.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
