import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1.5 p-1.5 bg-slate-100/90 dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-x-auto no-scrollbar max-w-full ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-xl transition-all font-sans whitespace-nowrap cursor-pointer select-none active:scale-98 ${
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs'
            } ${
              isActive
                ? 'bg-white dark:bg-[#1C1C21] text-[#0066FF] dark:text-sky-400 font-black shadow-xs ring-1 ring-slate-200/60 dark:ring-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 font-bold'
            }`}
          >
            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? 'text-[#0066FF]' : 'text-slate-400'
                }`}
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-[#0066FF] border border-blue-200/60'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
