"use server";

import { revalidatePath } from "next/cache";
import type { PillarKind } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { amendPillar } from "@/server/brands/amend";
import { refreshRtisChain, refreshRtisPillar } from "@/server/brands/rtis";
import { asPillarFields, fieldDef, isDerived } from "@/server/brands/pillar-config";
import { db } from "@/server/db";

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const PILLAR_KINDS = [
  "AUTHENTICITE",
  "DISTINCTION",
  "VALEUR",
  "ENGAGEMENT",
  "RISQUE",
  "TRACK",
  "INNOVATION",
  "STRATEGIE",
] as const;

const saveFieldSchema = z.object({
  brandId: z.string().min(1),
  kind: z.enum(PILLAR_KINDS),
  key: z.string().min(1),
  value: z.string().max(8000),
});

/** Édition directe d'un champ ADVE (mode DIRECT, certitude DECLARED). */
export async function saveFieldAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser("/cockpit/marque");
  const parsed = saveFieldSchema.safeParse({
    brandId: formData.get("brandId"),
    kind: formData.get("kind"),
    key: formData.get("key"),
    value: formData.get("value"),
  });
  if (!parsed.success) return { ok: false, error: "Saisie invalide." };
  const { brandId, kind, key, value } = parsed.data;

  const brand = await getOwnedBrand(user, brandId);
  if (!brand) return { ok: false, error: "Marque introuvable ou accès refusé." };
  if (isDerived(kind)) return { ok: false, error: "Un pilier dérivé ne s'édite pas — il se recalcule." };

  try {
    const result = await amendPillar({
      brandId: brand.id,
      kind,
      changes: { [key]: { value, certainty: "DECLARED" } },
      mode: "DIRECT",
      actor: { id: user.id, email: user.email },
    });
    revalidatePath("/cockpit", "layout");
    return {
      ok: true,
      message: `Enregistré — pilier ${result.pillarScore}/25, marque ${result.compositeScore}/200.`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur d'enregistrement." };
  }
}

/** Validation humaine d'un champ pré-rempli (INFERRED → OFFICIAL) ou déclaré (DECLARED → OFFICIAL). */
export async function validateFieldAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/marque");
  const brandId = String(formData.get("brandId") ?? "");
  const kind = String(formData.get("kind") ?? "") as PillarKind;
  const key = String(formData.get("key") ?? "");

  const brand = await getOwnedBrand(user, brandId);
  if (!brand) return;
  if (!fieldDef(kind, key)) return;
  const pillar = await db.pillar.findUnique({ where: { brandId_kind: { brandId: brand.id, kind } } });
  const state = asPillarFields(pillar?.fields)[key];
  if (!state) return;

  await amendPillar({
    brandId: brand.id,
    kind,
    changes: { [key]: { value: state.value, certainty: "OFFICIAL" } },
    mode: "DIRECT",
    actor: { id: user.id, email: user.email },
    note: `Validation du champ ${key}`,
  });
  revalidatePath("/cockpit", "layout");
}

/** Recalcul d'un pilier dérivé (bouton « rafraîchir », cahier §3.2). */
export async function refreshPillarAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/marque");
  const brandId = String(formData.get("brandId") ?? "");
  const kind = String(formData.get("kind") ?? "") as PillarKind;
  const brand = await getOwnedBrand(user, brandId);
  if (!brand) return;
  await refreshRtisPillar(brand.id, kind, { id: user.id, email: user.email });
  revalidatePath("/cockpit", "layout");
}

/** Recalcul de toute la chaîne R→T→I→S. */
export async function refreshChainAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/marque");
  const brandId = String(formData.get("brandId") ?? "");
  const brand = await getOwnedBrand(user, brandId);
  if (!brand) return;
  await refreshRtisChain(brand.id, { id: user.id, email: user.email });
  revalidatePath("/cockpit", "layout");
}

const sourceSchema = z.object({
  brandId: z.string().min(1),
  kind: z.enum(["LINK", "DOCUMENT", "NOTE"]),
  title: z.string().min(1).max(200),
  url: z.string().url().optional().or(z.literal("")),
  content: z.string().max(4000).optional().or(z.literal("")),
});

export async function addSourceAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser("/cockpit/marque");
  const parsed = sourceSchema.safeParse({
    brandId: formData.get("brandId"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    url: formData.get("url"),
    content: formData.get("content"),
  });
  if (!parsed.success) return { ok: false, error: "Formulaire invalide (titre requis, URL valide)." };
  const brand = await getOwnedBrand(user, parsed.data.brandId);
  if (!brand) return { ok: false, error: "Marque introuvable ou accès refusé." };
  await db.brandSource.create({
    data: {
      brandId: brand.id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      url: parsed.data.url || null,
      content: parsed.data.content || null,
    },
  });
  revalidatePath("/cockpit/marque/sources");
  return { ok: true, message: "Source ajoutée." };
}

export async function deleteSourceAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/marque");
  const id = String(formData.get("id") ?? "");
  const source = await db.brandSource.findUnique({ where: { id } });
  if (!source) return;
  const brand = await getOwnedBrand(user, source.brandId);
  if (!brand) return;
  await db.brandSource.delete({ where: { id } });
  revalidatePath("/cockpit/marque/sources");
}
