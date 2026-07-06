import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/guards";
import { hasRole } from "@/server/auth/guards";
import { asPillarFields } from "@/server/brands/pillar-config";
import { TIER_LABELS } from "@/server/scoring/score";

// Outils MCP : lectures RÉELLES, scopées au porteur de la clé (un founder ne
// lit que ses marques ; le staff lit le portefeuille du tenant). Aucune
// écriture en v2.0 — l'API expose la méthode, elle ne la contourne pas.

interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema (protocole MCP)
  run: (user: SessionUser, args: unknown) => Promise<{ result: unknown; brandId?: string | null }>;
}

function brandScope(user: SessionUser) {
  return hasRole(user, ["OPERATOR"])
    ? { operatorId: user.operatorId ?? "__none__", isShell: false }
    : { founderId: user.id, isShell: false };
}

async function accessibleBrand(user: SessionUser, ref: { brandId?: string; slug?: string }) {
  const brand = ref.brandId
    ? await db.brand.findUnique({ where: { id: ref.brandId } })
    : await db.brand.findFirst({ where: { slug: ref.slug ?? "__none__" } });
  if (!brand) throw new Error("Marque introuvable.");
  const staff = hasRole(user, ["OPERATOR"]) && brand.operatorId === user.operatorId;
  if (brand.founderId !== user.id && !staff && !user.roles.includes("ADMIN")) {
    throw new Error("Accès refusé à cette marque.");
  }
  return brand;
}

const brandRefSchema = z
  .object({ brandId: z.string().optional(), slug: z.string().optional() })
  .refine((v) => v.brandId || v.slug, { message: "brandId ou slug requis." });

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: "list_brands",
    description:
      "Liste les marques accessibles au porteur de la clé (score /200, palier, fraîcheur). Un founder voit ses marques, un opérateur son portefeuille.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async (user) => {
      const brands = await db.brand.findMany({
        where: brandScope(user),
        orderBy: { score: "desc" },
        include: { _count: { select: { pillars: { where: { stale: true } } } } },
      });
      return {
        result: brands.map((b) => ({
          id: b.id,
          slug: b.slug,
          name: b.name,
          sector: b.sector,
          country: b.country,
          score: b.score,
          tier: b.tier,
          tierLabel: TIER_LABELS[b.tier],
          stalePillars: b._count.pillars,
        })),
      };
    },
  },
  {
    name: "get_brand",
    description:
      "Détail d'une marque (par brandId ou slug) : piliers ADVE/RTIS avec scores /25, champs déclarés et niveaux de certitude. Ne renvoie que le déclaré — les champs vides restent vides.",
    inputSchema: {
      type: "object",
      properties: {
        brandId: { type: "string", description: "Id de la marque" },
        slug: { type: "string", description: "Slug de la marque (alternative à brandId)" },
      },
      additionalProperties: false,
    },
    run: async (user, args) => {
      const ref = brandRefSchema.parse(args ?? {});
      const brand = await accessibleBrand(user, ref);
      const pillars = await db.pillar.findMany({ where: { brandId: brand.id }, orderBy: { kind: "asc" } });
      return {
        brandId: brand.id,
        result: {
          id: brand.id,
          slug: brand.slug,
          name: brand.name,
          sector: brand.sector,
          score: brand.score,
          tier: brand.tier,
          tierLabel: TIER_LABELS[brand.tier],
          pillars: pillars.map((p) => ({
            kind: p.kind,
            score: p.score,
            stale: p.stale,
            refreshedAt: p.refreshedAt,
            fields: Object.entries(asPillarFields(p.fields)).map(([key, f]) => ({
              key,
              value: f.value,
              certainty: f.certainty,
              updatedAt: f.updatedAt,
            })),
          })),
        },
      };
    },
  },
  {
    name: "get_score_history",
    description:
      "Trajectoire d'une marque : instantanés horodatés (score /200, palier, Cult Index quand mesuré). L'évolution compte plus que le niveau.",
    inputSchema: {
      type: "object",
      properties: {
        brandId: { type: "string" },
        slug: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Nombre d'instantanés (défaut 30)" },
      },
      additionalProperties: false,
    },
    run: async (user, args) => {
      const parsed = brandRefSchema.and(z.object({ limit: z.number().int().min(1).max(100).optional() })).parse(args ?? {});
      const brand = await accessibleBrand(user, parsed);
      const snapshots = await db.brandSnapshot.findMany({
        where: { brandId: brand.id },
        orderBy: { createdAt: "desc" },
        take: parsed.limit ?? 30,
      });
      return {
        brandId: brand.id,
        result: snapshots.map((s) => ({
          at: s.createdAt,
          score: s.score,
          tier: s.tier,
          cultIndex: s.cultIndex,
          followers: s.followers,
        })),
      };
    },
  },
  {
    name: "list_missions",
    description:
      "Missions PUBLIÉES du mur de La Guilde (données publiques : titre, résumé, budget, compétences, échéance — jamais les contacts).",
    inputSchema: {
      type: "object",
      properties: {
        skill: { type: "string", description: "Filtre optionnel sur une compétence" },
      },
      additionalProperties: false,
    },
    run: async (_user, args) => {
      const { skill } = z.object({ skill: z.string().optional() }).parse(args ?? {});
      const missions = await db.mission.findMany({
        where: { status: "PUBLISHED", ...(skill ? { skills: { has: skill } } : {}) },
        orderBy: { publishedAt: "desc" },
        take: 50,
      });
      return {
        result: missions.map((m) => ({
          slug: m.slug,
          title: m.title,
          summary: m.summary,
          sector: m.sector,
          country: m.country,
          budgetMin: m.budgetMin,
          budgetMax: m.budgetMax,
          currency: m.currency,
          skills: m.skills,
          deadline: m.deadline,
          publishedAt: m.publishedAt,
        })),
      };
    },
  },
];

export function findTool(name: string): McpToolDef | undefined {
  return MCP_TOOLS.find((t) => t.name === name);
}
