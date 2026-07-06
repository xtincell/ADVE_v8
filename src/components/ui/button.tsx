import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-strong",
        secondary: "bg-surface-inverse text-ink-inverse hover:opacity-90",
        outline: "border border-line-strong bg-transparent text-ink hover:bg-surface-sunken",
        ghost: "text-ink hover:bg-surface-sunken",
        danger: "bg-danger text-white hover:opacity-90",
        gold: "bg-gold text-surface-inverse hover:bg-gold-strong",
      },
      size: {
        sm: "h-8 rounded-(--radius-xs) px-3 text-sm",
        md: "h-10 rounded-(--radius-sm) px-4 text-sm",
        lg: "h-12 rounded-(--radius-md) px-6 text-base",
        xl: "h-14 rounded-(--radius-lg) px-8 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function buttonClass(opts?: VariantProps<typeof buttonVariants> & { className?: string }): string {
  return cn(buttonVariants({ variant: opts?.variant, size: opts?.size }), opts?.className);
}
