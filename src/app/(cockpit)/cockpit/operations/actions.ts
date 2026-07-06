"use server";

import { revalidatePath } from "next/cache";
import type { ActionStatus, PillarKind } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { notify } from "@/server/notifications";

// Opérations (cahier §4.2) : roadmap d'actions de marque (manual-first, liées
// aux piliers) + demandes à l'opérateur. Rien d'automatique : c'est le carnet
// de bord du founder, l'opérateur répond côté Console.

export interface OpsFormState {
  ok?: boolean;
  error?: string;
}

const ADVE_RTIS = [
  "AUTHENTICITE",
  "DISTINCTION",
  "VALEUR",
  "ENGAGEMENT",
  "RISQUE",
  "TRACK",
  "INNOVATION",
  "STRATEGIE",
] as const;

const actionSchema = z.object({
  brandId: z.string().min(1),
  title: z.string().min(3).max(200),
  pillarKind: z.enum(ADVE_RTIS).optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
});

export async function addBrandActionAction(_prev: OpsFormState, formData: FormData): Promise<OpsFormState> {
  const user = await requireUser("/cockpit/operations");
  const parsed = actionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Titre requis (3 caractères min.)." };
  const brand = await getOwnedBrand(user, parsed.data.brandId);
  if (!brand) return { error: "Marque introuvable ou accès refusé." };
  await db.brandAction.create({
    data: {
      brandId: brand.id,
      title: parsed.data.title,
      pillarKind: (parsed.data.pillarKind || null) as PillarKind | null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      createdById: user.id,
    },
  });
  revalidatePath("/cockpit/operations");
  revalidatePath("/cockpit");
  return { ok: true };
}

const TRANSITIONS: Record<string, ActionStatus> = {
  start: "DOING",
  done: "DONE",
  cancel: "CANCELED",
  reopen: "TODO",
};

export async function setBrandActionStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/operations");
  const id = String(formData.get("id") ?? "");
  const to = TRANSITIONS[String(formData.get("to") ?? "")];
  if (!to) return;
  const action = await db.brandAction.findUnique({ where: { id } });
  if (!action) return;
  const brand = await getOwnedBrand(user, action.brandId);
  if (!brand) return;
  await db.brandAction.update({ where: { id }, data: { status: to } });
  revalidatePath("/cockpit/operations");
  revalidatePath("/cockpit");
}

const requestSchema = z.object({
  brandId: z.string().min(1),
  subject: z.string().min(5).max(160),
  message: z.string().min(10).max(3000),
});

/** Demande à l'opérateur — atterrit dans la file Console, réponse notifiée. */
export async function sendBrandRequestAction(_prev: OpsFormState, formData: FormData): Promise<OpsFormState> {
  const user = await requireUser("/cockpit/operations");
  const parsed = requestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Sujet (5 car. min.) et message (10 car. min.) requis." };
  const brand = await getOwnedBrand(user, parsed.data.brandId);
  if (!brand) return { error: "Marque introuvable ou accès refusé." };
  const request = await db.brandRequest.create({
    data: {
      brandId: brand.id,
      authorId: user.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
  });
  // La file vit en Console ; on notifie les opérateurs du tenant pour la découvrabilité.
  const operators = await db.user.findMany({
    where: { operatorId: brand.operatorId, roles: { hasSome: ["OPERATOR", "ADMIN"] } },
    select: { id: true },
  });
  for (const op of operators) {
    await notify({
      userId: op.id,
      type: "SYSTEM",
      title: "Nouvelle demande founder",
      body: `${brand.name} : ${request.subject}`,
      href: "/console/marques",
    });
  }
  revalidatePath("/cockpit/operations");
  return { ok: true };
}
