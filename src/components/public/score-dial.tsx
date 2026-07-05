"use client";

import { useEffect, useRef, useState } from "react";

// Score animé de la landing (cahier §4.1) : compte de 0 au score cible.
export function ScoreDial({
  target,
  tierLabel,
  max = 200,
  size = 220,
}: {
  target: number;
  tierLabel: string;
  max?: number;
  size?: number;
}) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const duration = 1600;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  const r = 84;
  const c = 2 * Math.PI * r;
  const progress = c * (1 - value / max);

  return (
    <div ref={ref} className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden className="-rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={progress}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-bold tabular-nums">{value}</span>
        <span className="font-mono text-xs text-ink-muted">/ {max}</span>
        <span className="mt-1 rounded-(--radius-xs) bg-gold-soft px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-gold-strong">
          {tierLabel}
        </span>
      </div>
    </div>
  );
}
