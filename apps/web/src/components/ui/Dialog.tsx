import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, description, children, className }: DialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative z-50 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {title && (
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
