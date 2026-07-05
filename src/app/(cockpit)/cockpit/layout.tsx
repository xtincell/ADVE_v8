import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/app-nav";
import { requireRole } from "@/server/auth/guards";

// La navigation s'étend au fil des tranches livrées (pas de liens morts).
const NAV: NavItem[] = [
  { href: "/cockpit", label: "Tableau de bord", exact: true },
  { href: "/cockpit/marque", label: "Ma marque" },
];

export default async function CockpitLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["FOUNDER", "OPERATOR"], "/cockpit");
  return (
    <AppShell user={user} surface="Cockpit" nav={NAV}>
      {children}
    </AppShell>
  );
}
