import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-98 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#0066FF] text-white shadow-xs hover:bg-blue-700 focus-visible:ring-blue-500",
        destructive:
          "bg-rose-600 text-white shadow-xs hover:bg-rose-700 focus-visible:ring-rose-500",
        outline:
          "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-slate-700 dark:text-zinc-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white",
        secondary:
          "bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800",
        ghost:
          "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white",
        link:
          "text-[#0066FF] underline-offset-4 hover:underline",
        success:
          "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 focus-visible:ring-emerald-500",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7.5 px-3 text-xs rounded-lg",
        lg: "h-11 px-6 text-sm rounded-xl",
        icon: "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
