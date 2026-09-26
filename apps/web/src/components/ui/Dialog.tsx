import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: DialogSize;
  className?: string;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-[95vw]',
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'lg',
  className,
}: DialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative z-50 w-full max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl animate-in fade-in-0 zoom-in-95',
          sizeClasses[size] || sizeClasses.lg,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-slate-800/80">
          <div>
            {title && <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h2>}
            {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors ml-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body (scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

