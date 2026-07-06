import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Label, Textarea } from "@/components/ui/form";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { assetContentSchema } from "@/server/assets";
import { EXPOSED_KINDS } from "@/server/assets/composers";
import { db } from "@/server/db";
import { llmAvailable } from "@/server/llm/gateway";
import { activateAssetAction, archiveAssetAction, reforgeAssetAction, updateAssetAction } from "../../actions";
import { ImproveButton } from "./improve-button";

export const dynamic = "force-dynamic";

const KIND_LABELS = Object.fromEntries(EXPOSED_KINDS.map((k) => [k.kind, k.label]));

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("/cockpit/livrables");
  const asset = await db.brandAsset.findUnique({ where: { id } });
  if (!asset) notFound();
  const brand = await getOwnedBrand(user, asset.brandId);
  if (!brand) notFound();
  const parsed = assetContentSchema.safeParse(asset.content);
  const sections = parsed.success ? parsed.data.sections : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cockpit/livrables" className="font-mono text-xs uppercase tracking-widest text-ink-faint hover:text-accent">
          ← Livrables
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{asset.title}</h1>
          {asset.staleAt && <Badge variant="gold">Périmé</Badge>}
          {asset.status === "ACTIVE" && <Badge variant="accent">Actif</Badge>}
          {asset.status === "DRAFT" && <Badge variant="outline">Brouillon</Badge>}
          {asset.status === "SUPERSEDED" && <Badge variant="neutral">Remplacé</Badge>}
          {asset.status === "ARCHIVED" && <Badge variant="neutral">Archivé</Badge>}
        </div>
        <p className="mt-1 font-mono text-xs text-ink-faint">
          {KIND_LABELS[asset.kind] ?? asset.kind} · v{asset.version} ·{" "}
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(asset.createdAt)}
          {asset.llmUsed ? " · assisté LLM" : " · composition déterministe"}
        </p>
      </div>

      {asset.staleAt && (
        <div className="rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
          Le socle ADVE a bougé depuis la composition de cet asset (
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(asset.staleAt)}) — reforgez-le
          pour repartir des données à jour.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {asset.status === "DRAFT" && (
          <form action={activateAssetAction}>
            <input type="hidden" name="id" value={asset.id} />
            <Button type="submit">Activer cet asset</Button>
          </form>
        )}
        <form action={reforgeAssetAction}>
          <input type="hidden" name="id" value={asset.id} />
          <Button type="submit" variant="outline">Reforger depuis le socle actuel</Button>
        </form>
        {llmAvailable() && <ImproveButton assetId={asset.id} />}
        {asset.status !== "ARCHIVED" && (
          <form action={archiveAssetAction}>
            <input type="hidden" name="id" value={asset.id} />
            <Button type="submit" variant="ghost">Archiver</Button>
          </form>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <article className="flex flex-col gap-6">
            {sections.map((s, i) => (
              <section key={i}>
                <h2 className="font-mono text-xs uppercase tracking-widest text-ink-faint">{s.title}</h2>
                {s.text.includes("[À compléter") ? (
                  <p className="mt-2 rounded-(--radius-sm) border border-gold bg-gold-soft px-3 py-2 text-sm">
                    {s.text}
                  </p>
                ) : (
                  <p className="mt-2 whitespace-pre-line text-base leading-relaxed">{s.text}</p>
                )}
              </section>
            ))}
          </article>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Édition manuelle</CardTitle>
          <CardDescription>
            Le texte vous appartient : ajustez chaque section à la main (manual-first) — la structure
            reste celle du livrable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAssetAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={asset.id} />
            {sections.map((s, i) => (
              <Field key={i}>
                <input type="hidden" name={`title-${i}`} value={s.title} />
                <Label htmlFor={`text-${i}`} className="text-xs">{s.title}</Label>
                <Textarea id={`text-${i}`} name={`text-${i}`} defaultValue={s.text} rows={3} />
              </Field>
            ))}
            <div>
              <Button type="submit" variant="outline">Enregistrer les modifications</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
