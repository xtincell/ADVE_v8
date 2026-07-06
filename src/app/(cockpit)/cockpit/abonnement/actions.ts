"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { audit } from "@/server/audit";
import { stripeClient } from "@/server/payments/stripe";

/** Résiliation à fin de période : l'accès court jusqu'à currentPeriodEnd (le cron expire ensuite). */
export async function cancelSubscriptionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/abonnement");
  const id = String(formData.get("id") ?? "");
  const sub = await db.subscription.findUnique({ where: { id } });
  if (!sub || sub.userId !== user.id || sub.canceledAt) return;

  if (sub.provider === "STRIPE" && sub.providerRef) {
    const stripe = stripeClient();
    if (stripe) {
      await stripe.subscriptions.update(sub.providerRef, { cancel_at_period_end: true });
    }
  }
  await db.subscription.update({ where: { id }, data: { canceledAt: new Date() } });
  await audit({
    operatorId: sub.operatorId,
    actorId: user.id,
    actorEmail: user.email,
    action: "subscription.cancel",
    entity: "Subscription",
    entityId: id,
    after: { atPeriodEnd: true },
  });
  revalidatePath("/cockpit/abonnement");
}
