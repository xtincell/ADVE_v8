"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block rounded-(--radius-sm) px-3 py-2 text-sm transition-colors",
                active ? "bg-accent-soft font-medium text-accent-strong" : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <nav aria-label="Navigation" className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-line px-3 py-6 md:block">
        <NavLinks items={items} />
      </nav>
      {/* Mobile */}
      <div className="fixed bottom-4 right-4 z-40 md:hidden">
        <button
          type="button"
          aria-label="Menu de navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-inverse text-ink-inverse shadow-lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
        {open && (
          <nav aria-label="Navigation mobile" className="absolute bottom-14 right-0 w-64 rounded-(--radius-lg) border border-line bg-surface-raised p-3 shadow-xl">
            <NavLinks items={items} onNavigate={() => setOpen(false)} />
          </nav>
        )}
      </div>
    </>
  );
}
