import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import { godModeEmails } from "@/env";
import { RoleEditor } from "./role-editor";

export const dynamic = "force-dynamic";

export default async function ConsoleComptesPage() {
  const me = await requireAdminWithMfa("/console/comptes");
  const operator = await getDefaultOperator();
  const users = await db.user.findMany({
    where: { operatorId: operator.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const gods = godModeEmails();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Console · Comptes</p>
        <h1 className="mt-1 text-3xl font-semibold">Comptes & accès</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>God-mode (variable d&apos;environnement)</CardTitle>
          <CardDescription>
            Ces emails sont toujours élevés ADMIN et bypassent tous les gates payants — modifiable
            uniquement via GOD_MODE_EMAILS (jamais en base).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {gods.map((g) => (
              <Badge key={g} variant="gold">{g}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({users.length})</CardTitle>
          <CardDescription>Multi-rôles par utilisateur ; tout changement de rôle est audité.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {u.name ?? u.email}
                    {gods.includes(u.email.toLowerCase()) && <Badge variant="gold">God</Badge>}
                    {u.mfaEnabled && <Badge variant="success">MFA</Badge>}
                  </p>
                  <p className="truncate font-mono text-xs text-ink-muted">
                    {u.email} · {u.country ?? "—"} · inscrit{" "}
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(u.createdAt)}
                  </p>
                </div>
                <RoleEditor userId={u.id} roles={u.roles} disabled={u.id === me.id} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
