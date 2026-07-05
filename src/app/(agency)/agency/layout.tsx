import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/app-nav";
import { requireRole } from "@/server/auth/guards";

const NAV: NavItem[] = [{ href: "/agency", label: "Mon agence", exact: true }];

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["AGENCY"], "/agency");
  return (
    <AppShell user={user} surface="Agency" nav={NAV}>
      {children}
    </AppShell>
  );
}
