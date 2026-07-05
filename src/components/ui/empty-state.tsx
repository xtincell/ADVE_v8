import { cn } from "@/lib/cn";

// Honest-empty (cahier §3.5.1) : un trou de données s'affiche comme état vide
// explicite — jamais comblé par des valeurs inventées. Ce composant est le
// standard de TOUS les écrans.

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  /** Étiquette d'état structuré (ex. DEFERRED, INSUFFISANT) — affichée en mono. */
  status?: string;
}

export function EmptyState({ title, description, action, icon, status, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-(--radius-md) border border-dashed border-line-strong bg-surface-sunken/50 px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {icon ?? (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden className="text-ink-faint">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      )}
      {status && <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">{status}</span>}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
