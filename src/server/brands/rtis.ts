import type { PillarKind } from "@prisma/client";
import { db } from "@/server/db";
import { amendPillar, type AmendResult } from "./amend";
import { deriveRtis, type AdveSnapshot, type RtisExtras } from "./rtis-derive";
import { RTIS_KINDS, type PillarFields } from "./pillar-config";

// Recalcul RTIS (cahier §3.2) : bouton « rafraîchir », par pilier ou en chaîne.
// La dérivation elle-même est pure (rtis-derive.ts) ; ici : chargement + écriture
// via le point d'écriture unique.

async function loadAdveSnapshot(brandId: string): Promise<AdveSnapshot> {
  const pillars = await db.pillar.findMany({
    where: { brandId, kind: { in: ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"] } },
  });
  const snapshot: AdveSnapshot = {};
  for (const p of pillars) snapshot[p.kind as keyof AdveSnapshot] = p.fields as PillarFields;
  return snapshot;
}

async function loadExtras(brandId: string): Promise<RtisExtras> {
  const brand = await db.brand.findUniqueOrThrow({ where: { id: brandId } });
  const signals = await db.marketSignal.findMany({
    where: { OR: [{ brandId }, { brandId: null, sector: brand.sector ?? "__none__" }] },
    orderBy: { fetchedAt: "desc" },
    take: 12,
  });
  return {
    sector: brand.sector,
    country: brand.country,
    signals: signals.map((s) => ({ title: s.title, source: s.source, summary: s.summary })),
  };
}

export async function refreshRtisPillar(
  brandId: string,
  kind: PillarKind,
  actor?: { id?: string | null; email?: string | null } | null,
): Promise<AmendResult> {
  if (!(RTIS_KINDS as readonly PillarKind[]).includes(kind)) {
    throw new Error(`${kind} n'est pas un pilier dérivé.`);
  }
  const adve = await loadAdveSnapshot(brandId);
  const extras = await loadExtras(brandId);

  // La cascade est unidirectionnelle : les piliers dérivés en aval de la chaîne
  // peuvent lire les dérivés amont déjà recalculés (I lit R/T, S lit R/T/I).
  const upstream: Partial<Record<PillarKind, PillarFields>> = {};
  const idx = RTIS_KINDS.indexOf(kind as (typeof RTIS_KINDS)[number]);
  if (idx > 0) {
    const upstreamPillars = await db.pillar.findMany({
      where: { brandId, kind: { in: RTIS_KINDS.slice(0, idx) as PillarKind[] } },
    });
    for (const p of upstreamPillars) upstream[p.kind] = p.fields as PillarFields;
  }

  const fields = deriveRtis(kind, adve, extras, upstream);
  const changes = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, { value, certainty: "OFFICIAL" as const }]),
  );
  return amendPillar({ brandId, kind, changes, mode: "RTIS_REFRESH", actor: actor ?? null });
}

/** Rafraîchit toute la chaîne R→T→I→S dans l'ordre de cascade. */
export async function refreshRtisChain(
  brandId: string,
  actor?: { id?: string | null; email?: string | null } | null,
): Promise<AmendResult[]> {
  const results: AmendResult[] = [];
  for (const kind of RTIS_KINDS) {
    results.push(await refreshRtisPillar(brandId, kind, actor));
  }
  return results;
}
