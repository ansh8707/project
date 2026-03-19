import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }> = ({ className, variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-primary text-white hover:opacity-90 shadow-sm',
    secondary: 'bg-border-dark text-text-main hover:bg-zinc-800 shadow-sm',
    outline: 'border border-border-dark bg-transparent hover:bg-border-dark text-text-main',
    ghost: 'bg-transparent hover:bg-border-dark text-text-sub',
    danger: 'bg-loss text-white hover:opacity-90 shadow-sm',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={cn('rounded-2xl border border-border-dark bg-card p-6 shadow-sm text-text-main', className)}
      {...props}
    />
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-xl border border-border-dark bg-background px-4 py-2 text-sm text-text-main ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border-dark p-6 shadow-2xl animate-in zoom-in-95 duration-200 my-auto max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-semibold text-text-main">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-border-dark rounded-full transition-colors">
            <svg className="w-5 h-5 text-text-sub" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto pr-1 custom-scrollbar text-text-main">
          {children}
        </div>
      </div>
    </div>
  );
};
