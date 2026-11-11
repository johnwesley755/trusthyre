import * as React from "react"
import { cn } from "@/lib/utils"

export interface TabsContextValue {
  value?: string
  onValueChange?: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue>({})

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value: controlledValue, defaultValue, onValueChange, className, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : uncontrolledValue

    const handleValueChange = React.useCallback(
      (val: string) => {
        if (!isControlled) {
          setUncontrolledValue(val)
        }
        onValueChange?.(val)
      },
      [isControlled, onValueChange]
    )

    return (
      <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn("space-y-4", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 dark:bg-zinc-900 p-1.5 border border-slate-200/80 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 overflow-x-auto no-scrollbar max-w-full",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  count?: number
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, count, children, onClick, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context.value === value

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        data-state={isActive ? "active" : "inactive"}
        onClick={(e) => {
          onClick?.(e)
          context.onValueChange?.(value)
        }}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer active:scale-98 disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "bg-white dark:bg-black text-[#0066FF] dark:text-[#38BDF8] font-extrabold shadow-2xs ring-1 ring-slate-200/60 dark:ring-zinc-800"
            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800",
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {count !== undefined && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-black transition-colors",
              isActive
                ? "bg-blue-50 dark:bg-blue-950/60 text-[#0066FF] dark:text-[#38BDF8] border border-blue-200/60 dark:border-blue-900/60"
                : "bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
            )}
          >
            {count}
          </span>
        )}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    if (context.value !== value) return null

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn("focus-visible:outline-none", className)}
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
