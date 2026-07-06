"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";

export function MobileNav({
  items,
  connected,
  home,
}: {
  items: { href: string; label: string }[];
  connected: boolean;
  home: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-(--radius-sm) text-ink hover:bg-surface-sunken"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-line bg-surface p-4 shadow-lg">
          <nav aria-label="Navigation mobile" className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-(--radius-sm) px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
              {connected && home ? (
                <Link href={home} onClick={() => setOpen(false)} className={buttonClass({ variant: "outline" })}>
                  Mon espace
                </Link>
              ) : (
                <Link href="/connexion" onClick={() => setOpen(false)} className={buttonClass({ variant: "outline" })}>
                  Connexion
                </Link>
              )}
              <Link href="/diagnostic" onClick={() => setOpen(false)} className={buttonClass({})}>
                Diagnostic gratuit
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
