import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, type Theme } from '../../providers/ThemeContext';
import { cn } from '../../lib/utils';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'pill' | 'icon' | 'dropdown';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  variant = 'pill',
  showLabel = false,
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun className="w-3.5 h-3.5 text-amber-500" />,
    },
    {
      value: 'dark',
      label: 'Pitch Dark',
      icon: <Moon className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      value: 'system',
      label: 'System',
      icon: <Laptop className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />,
    },
  ];

  const currentIcon =
    theme === 'system' ? (
      <Laptop className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300" />
    ) : resolvedTheme === 'dark' ? (
      <Moon className="w-3.5 h-3.5 text-blue-400" />
    ) : (
      <Sun className="w-3.5 h-3.5 text-amber-500" />
    );

  const currentLabel =
    theme === 'system' ? 'System' : resolvedTheme === 'dark' ? 'Dark' : 'Light';

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 transition-all duration-150 cursor-pointer select-none',
          variant === 'pill' &&
            'px-2.5 py-1.5 rounded-full bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-zinc-200 border border-slate-200/90 dark:border-zinc-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-[#141414] text-xs font-semibold',
          variant === 'icon' &&
            'w-8 h-8 rounded-full bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-zinc-200 border border-slate-200/90 dark:border-zinc-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-[#141414] items-center justify-center',
          variant === 'dropdown' &&
            'w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0a0a0a] text-slate-700 dark:text-zinc-200 border border-slate-200/90 dark:border-zinc-800 text-xs font-semibold justify-between'
        )}
        aria-label="Toggle Theme"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="shrink-0">{currentIcon}</span>
        {showLabel && <span className="truncate">{currentLabel}</span>}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-36 rounded-2xl bg-white dark:bg-[#111111] border border-slate-200/90 dark:border-zinc-800 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.6)] p-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
          role="menu"
        >
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer select-none text-left',
                  isSelected
                    ? 'bg-[#0f2f63]/10 dark:bg-white/10 text-[#0f2f63] dark:text-white font-bold'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900/80'
                )}
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0">{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-[#0f2f63] dark:text-white shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
