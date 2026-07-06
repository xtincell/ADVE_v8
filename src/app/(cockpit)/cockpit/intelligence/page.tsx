import Link from "next/link";
import type { DevotionLevel } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { checkSubscriptionGate } from "@/server/billing/gates";
import { db } from "@/server/db";
import { asPillarFields } from "@/server/brands/pillar-config";
import {
  cultIndex,
  devotionFromMembers,
  overtonRadar,
  superfanCount,
  type Devotion,
} from "@/server/intelligence/measures";
import { CommunityPanel } from "./community-panel";
import { SignalForm } from "./signal-form";

export const dynamic = "force-dynamic";

const DEVOTION_LABELS: Record<DevotionLevel, string> = {
  SPECTATEUR: "Spectateur",
  INTERESSE: "Intéressé",
  PARTICIPANT: "Participant",
  ENGAGE: "Engagé",
  AMBASSADEUR: "Ambassadeur",
  EVANGELISTE: "Évangéliste",
};

export default async function IntelligencePage() {
  const user = await requireUser("/cockpit/intelligence");
  const gate = await checkSubscriptionGate(user);

  // Gate premium structuré (cahier §6.2) : refus lisible + upgrade path, jamais une exception.
  if (!gate.allowed) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
          {gate.code}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">L&apos;Intelligence fait partie du Cockpit</h1>
        <p className="mt-3 text-ink-muted">
          Communauté et Devotion Ladder, Cult Index historisé, radar de fenêtre culturelle,
          veille sectorielle : ces instruments s&apos;activent avec l&apos;abonnement.
        </p>
        {gate.pending ? (
          <div className="mt-6 rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
            <strong>Votre paiement est en attente de validation.</strong> Un opérateur confirme la
            réception des fonds — cette page se débloquera automatiquement.
          </div>
        ) : (
          <Link href={gate.upgradePath} className={buttonClass({ size: "lg", className: "mt-6" })}>
            Activer l&apos;abonnement Cockpit
          </Link>
        )}
      </div>
    );
  }

  const brand = await getOwnedBrand(user);
  if (!brand) {
    return (
      <EmptyState
        title="Aucune marque"
        description="L'intelligence s'applique à votre marque — commencez par le diagnostic."
        action={<Link href="/diagnostic" className={buttonClass({})}>Faire mon diagnostic</Link>}
      />
    );
  }

  const [members, signals, pillars, snapshots] = await Promise.all([
    db.communityMember.findMany({ where: { brandId: brand.id }, orderBy: [{ level: "desc" }, { createdAt: "desc" }] }),
    db.marketSignal.findMany({
      where: { OR: [{ brandId: brand.id }, { brandId: null, sector: brand.sector ?? "__none__" }] },
      orderBy: { fetchedAt: "desc" },
      take: 12,
    }),
    db.pillar.findMany({ where: { brandId: brand.id } }),
    db.brandSnapshot.findMany({ where: { brandId: brand.id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const devotion: Devotion = devotionFromMembers(members.map((m) => m.level));
  const cult = cultIndex(devotion);
  const superfans = superfanCount(devotion);
  const adve = Object.fromEntries(
    pillars
      .filter((p) => ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"].includes(p.kind))
      .map((p) => [p.kind, asPillarFields(p.fields)]),
  );
  const radar = overtonRadar({ adve, devotion, signalCount: signals.length });
  const cultHistory = snapshots.filter((s) => s.cultIndex !== null).reverse();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Intelligence — {brand.name}</p>
        <h1 className="mt-1 text-3xl font-semibold">Communauté & position culturelle</h1>
      </div>

      {/* Mesures de tête */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-ink-muted">Membres recensés</p>
            <p className="mt-1 font-mono text-3xl font-bold">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-ink-muted">Superfans (Ambassadeur + Évangéliste)</p>
            <p className="mt-1 font-mono text-3xl font-bold text-accent">{superfans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-ink-muted">Cult Index /100</p>
            {cult ? (
              <>
                <p className="mt-1 font-mono text-3xl font-bold">{cult.value}</p>
                {cult.sample < 20 && (
                  <p className="font-mono text-[10px] uppercase tracking-wide text-gold-strong">
                    Échantillon &lt; 20 — indicatif
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 font-mono text-sm uppercase text-ink-faint">Insuffisant</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Devotion Ladder */}
      <Card>
        <CardHeader>
          <CardTitle>Devotion Ladder</CardTitle>
          <CardDescription>
            Six échelons, du passif au militant. L&apos;objectif de la méthode : faire monter
            chaque personne d&apos;un échelon — pas gonfler la base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <EmptyState
              status="INSUFFISANT"
              title="Aucun membre recensé"
              description="Commencez par les 10 personnes qui parlent déjà de votre marque — le recensement manuel honnête vaut tous les dashboards."
            />
          ) : (
            <div className="grid gap-2">
              {(Object.keys(DEVOTION_LABELS) as DevotionLevel[]).map((level) => {
                const count = devotion[level];
                const max = Math.max(...Object.values(devotion), 1);
                return (
                  <div key={level} className="grid grid-cols-[110px_1fr_40px] items-center gap-3">
                    <span className={`text-xs font-medium ${level === "AMBASSADEUR" || level === "EVANGELISTE" ? "text-accent" : "text-ink-muted"}`}>
                      {DEVOTION_LABELS[level]}
                    </span>
                    <div className="h-4 overflow-hidden rounded-(--radius-xs) bg-surface-sunken">
                      <div
                        className={`h-full ${level === "AMBASSADEUR" || level === "EVANGELISTE" ? "bg-accent" : "bg-line-strong"}`}
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-right font-mono text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communauté (manual-first) */}
      <CommunityPanel
        brandId={brand.id}
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          handle: m.handle,
          channel: m.channel,
          level: m.level,
          note: m.note,
        }))}
      />

      {/* Radar Overton */}
      <Card>
        <CardHeader>
          <CardTitle>Radar de fenêtre culturelle (heuristique)</CardTitle>
          <CardDescription>
            Chaque axe n&apos;est calculé que depuis vos données déclarées et mesurées — les axes
            sans données l&apos;affichent, rien n&apos;est fabriqué (pas de ML en v2.0).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {radar.map((axis) => (
              <div key={axis.key} className="rounded-(--radius-md) border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{axis.label}</p>
                  {axis.status === "OK" && <Badge variant="success">OK</Badge>}
                  {axis.status === "DEGRADED" && <Badge variant="gold">DEGRADED</Badge>}
                  {axis.status === "INSUFFICIENT_DATA" && <Badge variant="outline">INSUFFICIENT_DATA</Badge>}
                </div>
                {axis.value !== null ? (
                  <>
                    <p className="mt-2 font-mono text-2xl font-bold">{axis.value}<span className="text-sm text-ink-faint">/100</span></p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${axis.value}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm italic text-ink-faint">Pas assez de données pour cet axe.</p>
                )}
                <p className="mt-2 text-xs text-ink-muted">{axis.basis}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historique Cult Index */}
      {cultHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Trajectoire du Cult Index</CardTitle>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 300 60" className="h-16 w-full" role="img" aria-label="Évolution du Cult Index">
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                points={cultHistory
                  .map((s, i) => `${(i / Math.max(cultHistory.length - 1, 1)) * 290 + 5},${55 - ((s.cultIndex ?? 0) / 100) * 50}`)
                  .join(" ")}
              />
            </svg>
            <p className="font-mono text-xs text-ink-faint">
              {cultHistory.length} instantanés — la trajectoire compte plus que le niveau.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Veille / signaux */}
      <Card>
        <CardHeader>
          <CardTitle>Signaux marché</CardTitle>
          <CardDescription>
            Presse sectorielle (RSS), indicateurs macro (World Bank) et saisie terrain — uniquement
            des sources réelles. La collecte automatique tourne via le cron <code className="font-mono text-xs">signals</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignalForm brandId={brand.id} />
          {signals.length === 0 ? (
            <EmptyState
              className="mt-4"
              status="INSUFFISANT"
              title="Aucun signal collecté"
              description="Saisissez un signal terrain ci-dessus, ou laissez la veille automatique alimenter cette liste."
            />
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {signals.map((s) => (
                <li key={s.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-accent">
                          {s.title}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">{s.title}</p>
                      )}
                      {s.summary && <p className="mt-0.5 text-xs text-ink-muted">{s.summary}</p>}
                    </div>
                    <Badge variant={s.source === "MANUAL" ? "neutral" : s.source === "RSS_NEWS" ? "info" : "gold"}>
                      {s.source === "MANUAL" ? "Terrain" : s.source === "RSS_NEWS" ? "Presse" : "Macro"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
