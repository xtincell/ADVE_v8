import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-(--radius-xs) px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-surface-sunken text-ink-muted",
        accent: "bg-accent-soft text-accent-strong",
        gold: "bg-gold-soft text-gold-strong",
        success: "bg-success-soft text-success",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
        outline: "border border-line-strong text-ink-muted",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Badge de certitude d'un champ ADVE (cahier §3.1). */
export function CertaintyBadge({ certainty }: { certainty: "DECLARED" | "INFERRED" | "OFFICIAL" }) {
  if (certainty === "OFFICIAL") return <Badge variant="success">Validé</Badge>;
  if (certainty === "INFERRED") return <Badge variant="gold">À valider</Badge>;
  return <Badge variant="info">Déclaré</Badge>;
}
