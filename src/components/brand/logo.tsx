import { cn } from "@/lib/cn";

// Marque visuelle — placeholder propre (assets v1 indisponibles, cf. journal de build).
// Le glyphe fusée et les wordmarks sont dessinés en SVG/typo locales.

export function RocketMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path
        d="M16 3c4.2 2.6 6.5 6.8 6.5 11.7 0 2.6-.6 5-1.8 7.1l-4.7-2-4.7 2c-1.2-2.1-1.8-4.5-1.8-7.1C9.5 9.8 11.8 5.6 16 3Z"
        fill="var(--accent)"
      />
      <circle cx="16" cy="12.5" r="2.6" fill="var(--surface)" />
      <path d="M9.8 19.5 6 24.5l5.4-1.2c-.7-1.2-1.2-2.5-1.6-3.8Z" fill="var(--gold)" />
      <path d="M22.2 19.5c-.4 1.3-.9 2.6-1.6 3.8l5.4 1.2-3.8-5Z" fill="var(--gold)" />
      <path d="M14.2 24.8h3.6L16 29l-1.8-4.2Z" fill="var(--accent-strong)" />
    </svg>
  );
}

export function Logo({ withTagline = false, className }: { withTagline?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <RocketMark />
      <span className="leading-none">
        <span className="block font-display text-lg font-semibold tracking-tight">La Fusée</span>
        {withTagline && (
          <span className="block font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            by UPgraders
          </span>
        )}
      </span>
    </span>
  );
}
