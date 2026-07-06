import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/server/db";
import { formatMoney } from "@/server/billing/pricing";
import { getSessionUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

interface Brief {
  contexte?: string;
  objectifs?: string[];
  livrables?: string[];
  contraintes?: string;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const mission = await db.mission.findUnique({ where: { slug } });
  return mission ? { title: `${mission.title} · La Guilde`, description: mission.summary } : {};
}

export default async function MissionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mission = await db.mission.findUnique({ where: { slug } });
  // Le mur public ne montre que les missions publiées — les coordonnées de contact, jamais.
  if (!mission || mission.status !== "PUBLISHED") notFound();
  const brief = (mission.brief ?? {}) as Brief;
  const user = await getSessionUser();
  const isTalent = user?.roles.includes("TALENT") ?? false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/guilde" className="font-mono text-xs uppercase tracking-widest text-accent hover:underline">
        ← La Guilde
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {mission.sector && <Badge variant="neutral">{mission.sector}</Badge>}
        {mission.country && <Badge variant="outline">{mission.country}</Badge>}
        {mission.deadline && (
          <Badge variant="gold">
            Échéance {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(mission.deadline)}
          </Badge>
        )}
      </div>
      <h1 className="mt-3 text-3xl font-semibold">{mission.title}</h1>
      <p className="mt-2 text-ink-muted">{mission.summary}</p>
      <p className="mt-4 font-mono text-lg font-bold">
        {mission.budgetMin != null && mission.budgetMax != null
          ? `${formatMoney(mission.budgetMin, mission.currency)} – ${formatMoney(mission.budgetMax, mission.currency)}`
          : "Budget à discuter"}
      </p>

      <Card className="mt-8">
        <CardContent className="space-y-5 pt-5">
          {brief.contexte && (
            <section>
              <h2 className="font-display font-semibold">Contexte</h2>
              <p className="mt-1 text-sm text-ink-muted">{brief.contexte}</p>
            </section>
          )}
          {brief.objectifs && brief.objectifs.length > 0 && (
            <section>
              <h2 className="font-display font-semibold">Objectifs</h2>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
                {brief.objectifs.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>
          )}
          {brief.livrables && brief.livrables.length > 0 && (
            <section>
              <h2 className="font-display font-semibold">Livrables attendus</h2>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
                {brief.livrables.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </section>
          )}
          {brief.contraintes && (
            <section>
              <h2 className="font-display font-semibold">Contraintes</h2>
              <p className="mt-1 text-sm text-ink-muted">{brief.contraintes}</p>
            </section>
          )}
          {mission.skills.length > 0 && (
            <section>
              <h2 className="font-display font-semibold">Compétences recherchées</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mission.skills.map((s) => (
                  <Badge key={s} variant="accent">{s}</Badge>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 rounded-(--radius-md) border border-line bg-surface-raised p-5">
        {isTalent ? (
          <>
            <h2 className="font-display font-semibold">Candidater à cette mission</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Déposez votre candidature avec un devis structuré depuis votre espace Creator.
            </p>
            <Link href={`/creator/missions/${mission.slug}`} className={buttonClass({ className: "mt-3" })}>
              Candidater avec un devis
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-display font-semibold">Cette mission vous correspond ?</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Les candidatures passent par l&apos;espace talent — les coordonnées des marques ne
              sont jamais publiées. Talent déjà membre : connectez-vous. Nouveau ? L&apos;inscription
              ouvre avec l&apos;espace Guilde complet.
            </p>
            <Link href={`/connexion?next=${encodeURIComponent(`/guilde/${mission.slug}`)}`} className={buttonClass({ variant: "outline", className: "mt-3" })}>
              Se connecter
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
