import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
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
  const parsedOptions: DropdownOption<T>[] = React.useMemo(() => {
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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input on open if searchable
  useEffect(() => {
    if (isOpen && (searchable || parsedOptions.length > 10)) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable, parsedOptions.length]);

  const selectedOption = parsedOptions.find(
    (opt) => String(opt.value) === String(internalValue)
  );

  const handleSelect = (option: DropdownOption<T>) => {
    if (option.disabled || disabled) return;
    setInternalValue(option.value);
    setIsOpen(false);
    setSearchTerm('');
    if (onChange) {
      onChange(option.value);
    }
  };

  // Filter options if searchable or large list
  const isSearchEnabled = searchable || parsedOptions.length > 10;
  const filteredOptions = isSearchEnabled && searchTerm.trim()
    ? parsedOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : parsedOptions;

  // Variants styling
  const variantStyles = {
    default: 'bg-white border-[#e6e8ec] text-[#0A1931] hover:border-slate-300 focus-visible:border-[#0f2f63] shadow-2xs',
    outline: 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 focus-visible:border-[#0066FF] shadow-2xs',
    pill: 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] rounded-full text-[#0a0a0a]',
    subtle: 'bg-[#f8fafc] hover:bg-slate-100 border border-[#e6e8ec] text-slate-800',
    dark: 'bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-xs',
  };

  const sizeStyles = {
    sm: 'h-8 px-2.5 py-1 text-xs gap-1.5 rounded-lg',
    default: 'h-10 px-3.5 py-2 text-xs sm:text-sm gap-2 rounded-xl',
    lg: 'h-12 px-4 py-2.5 text-sm sm:text-base gap-2.5 rounded-2xl',
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block font-[\'Onest\',system-ui,sans-serif]', fullWidth && 'w-full', className)}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
        >
          {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Hidden input for standard form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={internalValue !== undefined ? String(internalValue) : ''}
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between transition-all outline-hidden cursor-pointer select-none text-left font-semibold',
          variantStyles[variant],
          sizeStyles[size],
          variant === 'pill' && 'rounded-full',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          isOpen && 'ring-2 ring-[#0f2f63]/10 border-[#0f2f63]',
          triggerClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {icon && <span className="shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={cn('truncate', !selectedOption && 'text-slate-400 font-normal')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
            variant === 'dark' ? 'text-white/70' : 'text-slate-400',
            isOpen && 'rotate-180 text-[#0f2f63]'
          )}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1.5 w-full min-w-[160px] bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150',
            menuClassName
          )}
          role="listbox"
        >
          {/* Optional Search Input */}
          {isSearchEnabled && (
            <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full text-xs font-medium text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-2.5 text-xs text-slate-400 text-center font-medium">
                No matching options
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(internalValue);
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-[#0f2f63]/10 text-[#0f2f63] font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium',
                      option.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                      <span className="truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className="text-[10px] text-slate-400 truncate">
                          ({option.sublabel})
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#0f2f63] shrink-0 ml-1" />
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

