import React from 'react';

export interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-800/80 mb-6 sm:mb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-slate-400">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{action}</div>}
    </header>
  );
}
