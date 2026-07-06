import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { signOutAction } from "@/app/(public)/(auth)/actions";
import type { SessionUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { AppNav, type NavItem } from "./app-nav";

// Shell des surfaces connectées (Cockpit, Console, Creator, Agency) :
// topbar + cloche temps réel + navigation latérale (drawer en mobile via AppNav).

export async function AppShell({
  user,
  surface,
  nav,
  children,
}: {
  user: SessionUser;
  surface: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const [latest, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="La Fusée — accueil">
              <Logo />
            </Link>
            <span className="rounded-(--radius-xs) bg-surface-sunken px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {surface}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell
              initial={latest.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.body,
                href: n.href,
                createdAt: n.createdAt.toISOString(),
                read: n.readAt !== null,
              }))}
              initialUnread={unreadCount}
            />
            <ThemeToggle />
            <details className="relative">
              <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-(--radius-sm) px-2 text-sm hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-accent-ink">
                  {(user.name ?? user.email)[0]?.toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate sm:block">{user.name ?? user.email}</span>
              </summary>
              <div className="absolute right-0 top-11 w-56 rounded-(--radius-md) border border-line bg-surface-raised p-2 shadow-lg">
                <p className="truncate px-2 py-1 text-xs text-ink-muted">{user.email}</p>
                {user.godMode && (
                  <p className="mx-2 my-1 rounded-(--radius-xs) bg-gold-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gold-strong">
                    God-mode actif
                  </p>
                )}
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-(--radius-sm) px-2 py-1.5 text-left text-sm text-danger hover:bg-danger-soft"
                  >
                    Se déconnecter
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl">
        <AppNav items={nav} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
