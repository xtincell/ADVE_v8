import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/app-nav";
import { requireAdminWithMfa } from "@/server/auth/guards";

// La navigation s'étend au fil des tranches livrées (S6 : comptes, argent, vault, config, audit).
const NAV: NavItem[] = [
  { href: "/console", label: "Vue d'ensemble", exact: true },
  { href: "/console/marques", label: "Portefeuille" },
  { href: "/console/argent", label: "Argent" },
  { href: "/console/guilde", label: "Guilde" },
  { href: "/console/comptes", label: "Comptes" },
  { href: "/console/vault", label: "Vault" },
  { href: "/console/config", label: "Config" },
  { href: "/console/audit", label: "Audit" },
];

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminWithMfa("/console");
  return (
    <AppShell user={user} surface="Console" nav={NAV}>
      {children}
    </AppShell>
  );
}
