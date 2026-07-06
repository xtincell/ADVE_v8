import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { getDefaultOperator } from "@/server/tenancy";
import { listCredentialStatus } from "@/server/vault";
import { PROVIDERS } from "./providers";
import { CredentialForm } from "./credential-form";
import { deleteCredentialAction } from "./actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";


export default async function VaultPage() {
  await requireAdminWithMfa("/console/vault");
  const operator = await getDefaultOperator();
  const statuses = await listCredentialStatus(operator.id);
  const byProvider = new Map(statuses.map((s) => [s.provider, s]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Console · Vault</p>
        <h1 className="mt-1 text-3xl font-semibold">Credentials des connecteurs</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Clés chiffrées en base (AES-256-GCM), jamais réaffichées — écrasez pour changer. Un
          connecteur sans clés répond DEFERRED_AWAITING_CREDENTIALS partout dans le produit, sans
          jamais simuler un succès.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PROVIDERS.map((p) => {
          const status = byProvider.get(p.id);
          return (
            <Card key={p.id} id={`vault-${p.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {p.label}
                  {status?.active ? (
                    <Badge variant="success">Configuré</Badge>
                  ) : (
                    <Badge variant="outline">DEFERRED</Badge>
                  )}
                </CardTitle>
                {status && (
                  <CardDescription>
                    Mis à jour le{" "}
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(status.updatedAt)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <CredentialForm provider={p.id} fields={p.fields} />
                {status?.active && (
                  <form action={deleteCredentialAction} className="mt-2">
                    <input type="hidden" name="provider" value={p.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-danger">
                      Supprimer les clés
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
