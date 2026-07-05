import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/app-nav";
import { requireRole } from "@/server/auth/guards";

const NAV: NavItem[] = [
  { href: "/creator", label: "Mon espace", exact: true },
  { href: "/creator/missions", label: "Missions" },
];

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["TALENT"], "/creator");
  return (
    <AppShell user={user} surface="Creator" nav={NAV}>
      {children}
    </AppShell>
  );
}
