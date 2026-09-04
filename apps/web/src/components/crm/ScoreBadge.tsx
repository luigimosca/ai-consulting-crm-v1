import React from 'react';
import { cn } from '@/lib/utils';
import { Flame, Zap, Snowflake } from 'lucide-react';

export interface ScoreBadgeProps {
  score: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, showIcon = true, size = 'md' }: ScoreBadgeProps) {
  let color = 'bg-rose-950/70 text-rose-300 border-rose-800/80';
  let Icon = Snowflake;
  let label = 'Freddo';

  if (score >= 75) {
    color = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 shadow-sm shadow-emerald-900/30';
    Icon = Flame;
    label = 'Caldo';
  } else if (score >= 45) {
    color = 'bg-amber-950/80 text-amber-300 border-amber-700/80';
    Icon = Zap;
    label = 'Tiepido';
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border',
        color,
        sizes[size]
      )}
      title={`Score: ${score}/100 (${label})`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}
      <span>{score}</span>
      <span className="opacity-60 text-[10px]">/100</span>
    </span>
  );
}
