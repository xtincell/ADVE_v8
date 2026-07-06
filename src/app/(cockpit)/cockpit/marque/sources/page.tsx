import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { db } from "@/server/db";
import { deleteSourceAction } from "../actions";
import { SourceForm } from "./source-form";

export const dynamic = "force-dynamic";

const KIND_LABELS = { LINK: "Lien", DOCUMENT: "Document", NOTE: "Note" } as const;

export default async function SourcesPage() {
  const user = await requireUser("/cockpit/marque/sources");
  const brand = await getOwnedBrand(user);
  if (!brand) notFound();
  const sources = await db.brandSource.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cockpit/marque" className="font-mono text-xs uppercase tracking-widest text-accent hover:underline">
          ← Ma marque
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Sources de la marque</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Liens, documents et notes qui documentent votre marque — la matière première de vos
          amendements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter une source</CardTitle>
        </CardHeader>
        <CardContent>
          <SourceForm brandId={brand.id} />
        </CardContent>
      </Card>

      {sources.length === 0 ? (
        <EmptyState
          title="Aucune source enregistrée"
          description="Ajoutez vos liens (site, réseaux, presse), documents et notes de terrain."
        />
      ) : (
        <ul className="grid gap-3">
          {sources.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 rounded-(--radius-md) border border-line bg-surface-raised p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{KIND_LABELS[s.kind]}</Badge>
                  <p className="font-medium">{s.title}</p>
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-sm text-accent underline">
                    {s.url}
                  </a>
                )}
                {s.content && <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{s.content}</p>}
              </div>
              <form action={deleteSourceAction}>
                <input type="hidden" name="id" value={s.id} />
                <Button type="submit" variant="ghost" size="sm" aria-label={`Supprimer ${s.title}`}>
                  Supprimer
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
