import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { db } from "@/server/db";
import { setBrandActionStatusAction } from "./actions";
import { ActionForm, RequestForm } from "./ops-forms";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

const PILLAR_SHORT: Record<string, string> = {
  AUTHENTICITE: "A",
  DISTINCTION: "D",
  VALEUR: "V",
  ENGAGEMENT: "E",
  RISQUE: "R",
  TRACK: "T",
  INNOVATION: "I",
  STRATEGIE: "S",
};

const REQUEST_STATUS: Record<string, { label: string; variant: "neutral" | "info" | "success" | "danger" }> = {
  OPEN: { label: "Envoyée", variant: "info" },
  IN_PROGRESS: { label: "En traitement", variant: "neutral" },
  DONE: { label: "Traitée", variant: "success" },
  DECLINED: { label: "Déclinée", variant: "danger" },
};

export default async function OperationsPage() {
  const user = await requireUser("/cockpit/operations");
  const brand = await getOwnedBrand(user);
  if (!brand) {
    return (
      <EmptyState
        title="Aucune marque"
        description="Les opérations pilotent votre marque — commencez par le diagnostic."
        action={<Link href="/diagnostic" className={buttonClass({})}>Faire mon diagnostic</Link>}
      />
    );
  }

  const [actions, requests, missions] = await Promise.all([
    db.brandAction.findMany({
      where: { brandId: brand.id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 50,
    }),
    db.brandRequest.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.mission.findMany({ where: { brandId: brand.id }, orderBy: { updatedAt: "desc" }, take: 10 }),
  ]);
  const open = actions.filter((a) => a.status === "TODO" || a.status === "DOING");
  const closed = actions.filter((a) => a.status === "DONE" || a.status === "CANCELED").slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Opérations — {brand.name}</p>
        <h1 className="mt-1 text-3xl font-semibold">Roadmap & demandes</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          Le carnet de bord de la marque : des actions reliées aux piliers, et un fil direct avec
          votre opérateur UPgraders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions de marque</CardTitle>
          <CardDescription>
            Une action vise un pilier : quand elle est faite, amendez le pilier — c&apos;est
            l&apos;amendement qui fait bouger le score, pas la liste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm brandId={brand.id} />
          {open.length === 0 && closed.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="Aucune action planifiée"
              description="Commencez par les recommandations de vos piliers les plus faibles."
            />
          ) : (
            <>
              <ul className="mt-4 divide-y divide-line">
                {open.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {a.pillarKind && <Badge variant="outline">{PILLAR_SHORT[a.pillarKind]}</Badge>}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="font-mono text-xs text-ink-faint">
                          {a.status === "DOING" ? "En cours" : "À faire"}
                          {a.dueAt ? ` · échéance ${dateFmt.format(a.dueAt)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {a.status === "TODO" && (
                        <form action={setBrandActionStatusAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="to" value="start" />
                          <Button type="submit" size="sm" variant="outline">Démarrer</Button>
                        </form>
                      )}
                      <form action={setBrandActionStatusAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="to" value="done" />
                        <Button type="submit" size="sm">Terminer</Button>
                      </form>
                      <form action={setBrandActionStatusAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="to" value="cancel" />
                        <Button type="submit" size="sm" variant="ghost" aria-label={`Annuler ${a.title}`}>✕</Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
              {closed.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-mono text-xs text-ink-faint hover:text-ink">
                    Historique récent ({closed.length})
                  </summary>
                  <ul className="mt-2 divide-y divide-line">
                    {closed.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm text-ink-muted">
                        <span className={a.status === "CANCELED" ? "line-through" : ""}>{a.title}</span>
                        <Badge variant={a.status === "DONE" ? "success" : "neutral"}>
                          {a.status === "DONE" ? "Faite" : "Annulée"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demandes à l&apos;opérateur</CardTitle>
          <CardDescription>
            Shooting, campagne, arbitrage — votre opérateur répond ici et vous êtes notifié.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestForm brandId={brand.id} />
          {requests.length > 0 && (
            <ul className="mt-5 divide-y divide-line">
              {requests.map((r) => {
                const s = REQUEST_STATUS[r.status] ?? REQUEST_STATUS.OPEN!;
                return (
                  <li key={r.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{r.subject}</p>
                      <span className="flex items-center gap-2">
                        <Badge variant={s.variant}>{s.label}</Badge>
                        <span className="font-mono text-xs text-ink-faint">{dateFmt.format(r.createdAt)}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{r.message}</p>
                    {r.response && (
                      <div className="mt-2 rounded-(--radius-sm) border border-line bg-surface-sunken px-3 py-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Réponse de l&apos;opérateur</p>
                        <p className="mt-1 text-sm">{r.response}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Missions liées à ma marque</CardTitle>
          <CardDescription>Les missions de La Guilde rattachées à {brand.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <EmptyState
              title="Aucune mission"
              description="Confiez un besoin à La Guilde : brief structuré, candidatures arbitrées."
              action={<Link href="/guilde/deposer" className={buttonClass({ size: "sm" })}>Déposer une mission</Link>}
            />
          ) : (
            <ul className="divide-y divide-line">
              {missions.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                  <Link href={`/guilde/${m.slug}`} className="text-sm font-medium hover:text-accent">
                    {m.title}
                  </Link>
                  <Badge variant={m.status === "PUBLISHED" ? "accent" : m.status === "COMPLETED" ? "success" : "neutral"}>
                    {m.status === "PENDING_REVIEW" ? "En modération" : m.status === "PUBLISHED" ? "Publiée" : m.status === "ASSIGNED" ? "Attribuée" : m.status === "COMPLETED" ? "Terminée" : m.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
