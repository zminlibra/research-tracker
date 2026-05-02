'use client';

import { useEffect, useState } from 'react';
import { isFavorited, addFavorite, removeFavorite } from '@/lib/auth-store';

interface FavoriteButtonProps {
  articleId: string;
}

export default function FavoriteButton({ articleId }: FavoriteButtonProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isFavorited(articleId));
  }, [articleId]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (active) {
      removeFavorite(articleId);
      setActive(false);
    } else {
      addFavorite(articleId);
      setActive(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      title={active ? '取消收藏' : '收藏'}
      className={`transition-colors ${active ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
    >
      {active ? '❤️' : '🤍'}
    </button>
  );
}
