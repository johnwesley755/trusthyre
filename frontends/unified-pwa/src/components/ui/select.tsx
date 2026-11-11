import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
export { Dropdown, type DropdownOption, type DropdownProps } from "./dropdown";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
  variant?: "default" | "outline" | "pill" | "subtle" | "dark";
  selectSize?: "sm" | "default" | "lg";
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      children,
      icon,
      label,
      error,
      variant = "default",
      selectSize = "default",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    const variantStyles = {
      default:
        "bg-white dark:bg-[#121215] border-[#e6e8ec] dark:border-zinc-800 text-[#0A1931] dark:text-white hover:border-slate-300 dark:hover:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#38BDF8]/20 shadow-2xs",
      outline:
        "bg-white dark:bg-[#121215] border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 focus:border-[#0066FF] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#0066FF]/10 shadow-2xs",
      pill: "bg-[#f4f4f4] dark:bg-[#121215] hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 rounded-full text-[#0a0a0a] dark:text-white",
      subtle:
        "bg-[#f8fafc] dark:bg-[#09090b] hover:bg-slate-100 dark:hover:bg-zinc-900 border border-[#e6e8ec] dark:border-zinc-800 text-slate-800 dark:text-zinc-200",
      dark: "bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-xs",
    };

    const sizeStyles = {
      sm: "h-8 pl-2.5 pr-7 py-1 text-xs rounded-lg",
      default: "h-10 pl-3.5 pr-8 py-2 text-xs sm:text-sm rounded-xl",
      lg: "h-12 pl-4 pr-10 py-2.5 text-sm sm:text-base rounded-2xl",
    };

    return (
      <div className="w-full font-['Onest',system-ui,sans-serif]">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 pointer-events-none text-slate-400 shrink-0">
              {icon}
            </div>
          )}

          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full appearance-none transition-all outline-none font-semibold cursor-pointer",
              variantStyles[variant],
              sizeStyles[selectSize],
              icon && "pl-9",
              variant === "pill" && "rounded-full",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none",
              error && "border-red-400 focus:border-red-500 focus:ring-red-100",
              className
            )}
            {...props}
          >
            {children}
          </select>

          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 pointer-events-none absolute right-3 shrink-0 transition-colors",
              variant === "dark" ? "text-white/70" : "text-slate-400"
            )}
          />
        </div>

        {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };

