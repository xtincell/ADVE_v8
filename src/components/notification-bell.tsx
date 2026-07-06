"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { markAllReadAction } from "@/app/notifications-actions";

interface Item {
  id: string;
  title: string;
  body?: string | null;
  href?: string | null;
  createdAt: string;
  read: boolean;
}

// Cloche temps réel : EventSource sur le flux SSE unique, reprise `?since=`
// gérée par le serveur, reconnexion native d'EventSource.
export function NotificationBell({
  initial,
  initialUnread,
}: {
  initial: Item[];
  initialUnread: number;
}) {
  const [items, setItems] = useState<Item[]>(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const lastSeen = useRef<string>(initial[0]?.createdAt ?? new Date().toISOString());

  useEffect(() => {
    const source = new EventSource(`/api/sse?since=${encodeURIComponent(lastSeen.current)}`);
    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as Item & { createdAt: string };
        lastSeen.current = event.createdAt;
        setItems((prev) => (prev.some((i) => i.id === event.id) ? prev : [{ ...event, read: false }, ...prev].slice(0, 15)));
        setUnread((n) => n + 1);
      } catch {}
    };
    return () => source.close();
  }, []);

  const markAll = useCallback(async () => {
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await markAllReadAction();
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-(--radius-sm) text-ink-muted hover:bg-surface-sunken"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3a6 6 0 0 0-6 6v3.2l-1.4 2.9a.8.8 0 0 0 .72 1.15h13.36a.8.8 0 0 0 .72-1.15L18 12.2V9a6 6 0 0 0-6-6ZM9.5 18.5a2.5 2.5 0 0 0 5 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span
            data-testid="unread-badge"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-accent-ink"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-(--radius-md) border border-line bg-surface-raised shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-accent hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-ink-muted">Aucune notification.</li>
            ) : (
              items.map((n) => (
                <li key={n.id} className={`border-b border-line last:border-0 ${n.read ? "" : "bg-accent-soft/40"}`}>
                  {n.href ? (
                    <Link href={n.href} onClick={() => setOpen(false)} className="block px-3 py-2.5 hover:bg-surface-sunken">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{n.body}</p>}
                    </Link>
                  ) : (
                    <div className="px-3 py-2.5">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{n.body}</p>}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
