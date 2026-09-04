import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'purple';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-blue-900/60 text-blue-300 border-blue-700/60',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
    warning: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
    destructive: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
    purple: 'bg-purple-950/70 text-purple-300 border-purple-700/60',
    outline: 'border-slate-700 text-slate-300',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
