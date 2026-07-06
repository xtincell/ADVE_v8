"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export function ZoneTabs({
  zones,
  current,
}: {
  zones: { id: string; label: string; hint: string }[];
  current: string;
}) {
  return (
    <div role="tablist" aria-label="Zone tarifaire" className="mt-8 flex flex-wrap gap-2">
      {zones.map((z) => (
        <Link
          key={z.id}
          role="tab"
          aria-selected={z.id === current}
          href={`/tarifs?zone=${z.id}`}
          className={cn(
            "rounded-(--radius-sm) border px-4 py-2 text-sm transition-colors",
            z.id === current
              ? "border-accent bg-accent-soft font-medium text-accent-strong"
              : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
          )}
        >
          <span className="block">{z.label}</span>
          <span className="block text-[11px] text-ink-faint">{z.hint}</span>
        </Link>
      ))}
    </div>
  );
}
