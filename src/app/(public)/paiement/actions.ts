"use server";

import { redirect } from "next/navigation";
import type { PaymentProvider, PlanTier } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/guards";
import { getDefaultOperator } from "@/server/tenancy";
import { getOwnedBrand } from "@/server/brands/queries";
import { startCheckout } from "@/server/payments";
import { RECURRING_TIERS } from "@/server/billing/gates";

export interface CheckoutFormState {
  error?: string;
  manual?: { waLink: string; reference: string; instructions: string };
  deferred?: { provider: string; missing: string[] };
}

const schema = z.object({
  provider: z.enum(["STRIPE", "WAVE", "MTN_MOMO", "ORANGE_MONEY", "CINETPAY", "PAYPAL", "MANUAL_WHATSAPP", "MOCK"]),
  offre: z.enum(["INTAKE_PDF", "ORACLE_FULL", "COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"]),
  token: z.string().optional(),
  marque: z.string().optional(),
});

export async function startCheckoutAction(_prev: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const parsed = schema.safeParse({
    provider: formData.get("provider"),
    offre: formData.get("offre"),
    token: formData.get("token") || undefined,
    marque: formData.get("marque") || undefined,
  });
  if (!parsed.success) return { error: "Sélection invalide." };
  const { provider, offre, token, marque } = parsed.data;

  const operator = await getDefaultOperator();
  const user = await getSessionUser();
  const recurring = (RECURRING_TIERS as PlanTier[]).includes(offre);

  let countryCode: string | null | undefined = user?.godMode ? null : undefined;
  let brandId: string | null = null;
  let intakeToken: string | null = null;
  let customerEmail: string | null = user?.email ?? null;
  let returnPath: string;

  if (token) {
    const session = await db.intakeSession.findUnique({ where: { token } });
    if (!session) return { error: "Diagnostic introuvable." };
    intakeToken = token;
    countryCode = (session.answers as { country?: string }).country;
    customerEmail = customerEmail ?? session.email;
    returnPath = `/diagnostic/${token}/resultat`;
  } else if (marque) {
    if (!user) redirect(`/connexion?next=${encodeURIComponent(`/paiement?offre=${offre}&marque=${marque}`)}`);
    const brand = await getOwnedBrand(user, marque);
    if (!brand) return { error: "Marque introuvable ou accès refusé." };
    brandId = brand.id;
    countryCode = brand.country;
    returnPath = "/cockpit/livrables";
  } else if (recurring) {
    if (!user) redirect(`/connexion?next=${encodeURIComponent(`/paiement?offre=${offre}`)}`);
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    countryCode = dbUser?.country;
    const brand = await getOwnedBrand(user);
    brandId = brand?.id ?? null;
    returnPath = "/cockpit/abonnement";
  } else {
    return { error: "Contexte d'achat manquant." };
  }

  let outcome: Awaited<ReturnType<typeof startCheckout>>;
  try {
    outcome = await startCheckout({
      operatorId: operator.id,
      provider: provider as PaymentProvider,
      tier: offre,
      countryCode,
      recurring,
      userId: user?.id ?? null,
      brandId,
      intakeToken,
      customerEmail,
      returnPath,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Le paiement n'a pas pu être initié." };
  }

  const { result } = outcome;
  if (result.kind === "redirect") redirect(result.url);
  if (result.kind === "granted") redirect(`${returnPath}${returnPath.includes("?") ? "&" : "?"}paiement=ok`);
  if (result.kind === "manual") return { manual: { waLink: result.waLink, reference: result.reference, instructions: result.instructions } };
  return { deferred: { provider, missing: result.missing } };
}
