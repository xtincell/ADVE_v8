"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { notify } from "@/server/notifications";

export interface RespondFormState {
  ok?: boolean;
  error?: string;
}

const respondSchema = z.object({
  requestId: z.string().min(1),
  response: z.string().min(3).max(3000),
  outcome: z.enum(["DONE", "DECLINED", "IN_PROGRESS"]),
});

/** Réponse opérateur à une demande founder (cahier §4.2/§4.3) — notifiée à l'auteur. */
export async function respondBrandRequestAction(
  _prev: RespondFormState,
  formData: FormData,
): Promise<RespondFormState> {
  const operator = await requireAdminWithMfa("/console/marques");
  const parsed = respondSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Réponse requise (3 caractères min.)." };
  const request = await db.brandRequest.findUnique({
    where: { id: parsed.data.requestId },
    include: { brand: true },
  });
  if (!request || request.brand.operatorId !== operator.operatorId) {
    return { error: "Demande introuvable dans votre tenant." };
  }
  await db.brandRequest.update({
    where: { id: request.id },
    data: {
      status: parsed.data.outcome,
      response: parsed.data.response,
      respondedById: operator.id,
      respondedAt: new Date(),
    },
  });
  await notify({
    userId: request.authorId,
    type: "SYSTEM",
    title: "Réponse de votre opérateur",
    body: `${request.subject} — ${parsed.data.outcome === "DECLINED" ? "déclinée" : parsed.data.outcome === "DONE" ? "traitée" : "en traitement"}.`,
    href: "/cockpit/operations",
  });
  await audit({
    operatorId: request.brand.operatorId,
    actorId: operator.id,
    actorEmail: operator.email,
    action: "brand_request.respond",
    entity: "BrandRequest",
    entityId: request.id,
    after: { status: parsed.data.outcome },
  });
  revalidatePath("/console/marques");
  return { ok: true };
}
