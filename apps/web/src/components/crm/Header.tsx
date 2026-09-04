import React from 'react';

export interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </header>
  );
}
