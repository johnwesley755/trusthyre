import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  group?: string;
}

export interface DropdownProps<T = string> {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  options?: DropdownOption<T>[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  variant?: 'default' | 'outline' | 'pill' | 'subtle' | 'dark';
  size?: 'sm' | 'default' | 'lg';
  name?: string;
  id?: string;
  children?: React.ReactNode;
}

export function Dropdown<T extends string | number = string>({
  value,
  defaultValue,
  onChange,
  options: directOptions,
  placeholder = 'Select an option...',
  label,
  icon,
  disabled = false,
  required = false,
  searchable = false,
  clearable = false,
  fullWidth = true,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  variant = 'default',
  size = 'default',
  name,
  id,
  children,
}: DropdownProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;

  // Extract options from children if <option> tags are passed
  const parsedOptions: DropdownOption<T>[] = useMemo(() => {
    if (directOptions && directOptions.length > 0) {
      return directOptions;
    }
    if (!children) return [];

    const extracted: DropdownOption<T>[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        const childProps = child.props as any;
        extracted.push({
          value: (childProps.value ?? '') as T,
          label: String(childProps.children ?? childProps.value ?? ''),
          disabled: childProps.disabled,
        });
      }
    });
    return extracted;
  }, [directOptions, children]);

  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<T | undefined>(value ?? defaultValue);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);

  // Sync internal value with controlled value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isSearchEnabled = searchable || parsedOptions.length > 8;

  // Filter options
  const filteredOptions = useMemo(() => {
    if (!isSearchEnabled || !searchTerm.trim()) {
      return parsedOptions;
    }
    const cleanQuery = searchTerm.toLowerCase().trim();
    return parsedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(cleanQuery) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(cleanQuery)) ||
        (opt.description && opt.description.toLowerCase().includes(cleanQuery)) ||
        (opt.badge && opt.badge.toLowerCase().includes(cleanQuery))
    );
  }, [parsedOptions, isSearchEnabled, searchTerm]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && isSearchEnabled) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    }
  }, [isOpen, isSearchEnabled]);

  const selectedOption = parsedOptions.find(
    (opt) => String(opt.value) === String(internalValue)
  );

  const handleSelect = (option: DropdownOption<T>) => {
    if (option.disabled || disabled) return;
    setInternalValue(option.value);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    if (onChange) {
      onChange(option.value);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalValue(undefined);
    setSearchTerm('');
    if (onChange) {
      onChange('' as unknown as T);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return next;
        });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return next;
        });
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      }
      default:
        break;
    }
  };

  // Auto scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && menuListRef.current) {
      const items = menuListRef.current.querySelectorAll('[data-dropdown-item]');
      const activeEl = items[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Luxury-Grade Design Tokens & Aesthetics
  const variantStyles = {
    default:
      'bg-white text-[#0A1931] border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-slate-300 hover:shadow-xs focus-visible:border-[#0f2f63] focus-visible:ring-2 focus-visible:ring-[#0f2f63]/10',
    outline:
      'bg-white text-slate-800 border border-slate-300/80 hover:border-slate-400 hover:bg-slate-50/50 shadow-2xs focus-visible:border-[#0066FF] focus-visible:ring-2 focus-visible:ring-[#0066FF]/10',
    pill:
      'bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 rounded-full text-[#0a0a0a] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#0f2f63]/10',
    subtle:
      'bg-[#f8fafc] hover:bg-slate-100/90 border border-slate-200/80 text-slate-800 focus-visible:border-[#0f2f63] focus-visible:ring-2 focus-visible:ring-[#0f2f63]/10',
    dark:
      'bg-slate-900/90 hover:bg-slate-900 border border-white/15 text-white shadow-lg backdrop-blur-md focus-visible:ring-2 focus-visible:ring-white/20',
  };

  const sizeStyles = {
    sm: 'h-8 px-2.5 py-1 text-xs gap-1.5 rounded-lg font-medium',
    default: 'h-10 px-3.5 py-2 text-xs sm:text-sm gap-2 rounded-xl font-semibold',
    lg: 'h-12 px-4 py-2.5 text-sm sm:text-base gap-2.5 rounded-2xl font-semibold',
  };

  const isDark = variant === 'dark';

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-block font-[\'Onest\',system-ui,sans-serif]',
        fullWidth && 'w-full',
        className
      )}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 select-none"
        >
          {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Hidden input for native HTML form serialization */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={internalValue !== undefined ? String(internalValue) : ''}
        />
      )}

      {/* Trigger Button with Interactive Micro-States */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between transition-all duration-150 outline-hidden cursor-pointer select-none text-left',
          variantStyles[variant],
          sizeStyles[size],
          variant === 'pill' && 'rounded-full',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          isOpen && 'border-[#0f2f63] ring-2 ring-[#0f2f63]/10 shadow-xs',
          isOpen && isDark && 'border-white/30 ring-2 ring-white/10',
          triggerClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {icon && (
            <span className={cn('shrink-0 transition-colors', isDark ? 'text-slate-400' : 'text-slate-500')}>
              {icon}
            </span>
          )}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span
            className={cn(
              'truncate transition-colors',
              !selectedOption && (isDark ? 'text-slate-400 font-normal' : 'text-slate-400 font-normal'),
              selectedOption && (isDark ? 'text-white' : 'text-[#0A1931]')
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={cn(
                'ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md shrink-0 uppercase tracking-wider',
                isDark
                  ? 'bg-white/20 text-white'
                  : 'bg-[#0f2f63]/10 text-[#0f2f63]'
              )}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1.5">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-white/20 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-out',
              isDark ? 'text-white/60' : 'text-slate-400',
              isOpen && 'rotate-180',
              isOpen && (isDark ? 'text-white' : 'text-[#0f2f63]')
            )}
          />
        </div>
      </button>

      {/* Floating Popover Menu with Raycast/Linear-Grade Floating Depth */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1.5 w-full min-w-[200px] rounded-2xl shadow-[0_12px_36px_-6px_rgba(15,47,99,0.18),0_4px_12px_-2px_rgba(0,0,0,0.06)] border overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-1.5 duration-150 ease-out',
            isDark
              ? 'bg-slate-900/95 border-slate-700/80 text-white backdrop-blur-md'
              : 'bg-white/98 border-slate-200/90 text-[#0A1931] backdrop-blur-md',
            menuClassName
          )}
          role="listbox"
        >
          {/* Frosted Glass Sticky Search Input */}
          {isSearchEnabled && (
            <div
              className={cn(
                'sticky top-0 z-10 px-3 py-2 border-b flex items-center gap-2 backdrop-blur-xs',
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-100'
              )}
            >
              <Search className={cn('w-3.5 h-3.5 shrink-0', isDark ? 'text-slate-400' : 'text-slate-400')} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search options..."
                className={cn(
                  'w-full text-xs font-medium placeholder:font-normal bg-transparent outline-none',
                  isDark ? 'text-white placeholder:text-slate-400' : 'text-slate-800 placeholder:text-slate-400'
                )}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className={cn(
                    'p-0.5 rounded-full transition-colors',
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Options List with Dynamic Padding & Pill Highlights */}
          <div ref={menuListRef} className="max-h-64 overflow-y-auto no-scrollbar p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-6 text-xs text-slate-400 text-center font-medium">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = String(option.value) === String(internalValue);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={`${String(option.value)}-${idx}`}
                    data-dropdown-item
                    type="button"
                    disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      'w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-all duration-100 cursor-pointer select-none',
                      isSelected && (
                        isDark
                          ? 'bg-blue-600/30 text-white font-bold ring-1 ring-blue-500/40'
                          : 'bg-[#0f2f63]/10 text-[#0f2f63] font-bold'
                      ),
                      !isSelected && isHighlighted && (
                        isDark
                          ? 'bg-white/10 text-white font-medium'
                          : 'bg-slate-100 text-[#0A1931] font-medium'
                      ),
                      !isSelected && !isHighlighted && (
                        isDark
                          ? 'text-slate-300 hover:bg-white/10'
                          : 'text-slate-700 hover:bg-slate-50'
                      ),
                      option.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2 min-w-0">
                      {option.icon && (
                        <span className={cn('shrink-0 text-slate-400', isSelected && 'text-[#0f2f63]')}>
                          {option.icon}
                        </span>
                      )}
                      <div className="truncate flex flex-col">
                        <span className="truncate">{option.label}</span>
                        {option.description && (
                          <span className={cn('text-[10px] truncate mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
                            {option.description}
                          </span>
                        )}
                      </div>
                      {option.sublabel && (
                        <span className={cn('text-[10px] shrink-0', isDark ? 'text-slate-400' : 'text-slate-400')}>
                          {option.sublabel}
                        </span>
                      )}
                      {option.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-[9px] font-bold rounded-md shrink-0 uppercase tracking-wider',
                            isDark ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'
                          )}
                        >
                          {option.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 ml-1.5',
                          isDark ? 'text-blue-400' : 'text-[#0f2f63]'
                        )}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
