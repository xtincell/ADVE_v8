import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { PaymentProvider } from "@prisma/client";
import Stripe from "stripe";
import { db } from "@/server/db";
import { env } from "@/env";
import { stripeClient } from "@/server/payments/stripe";
import { settlePayment } from "@/server/payments/settle";
import { cinetpayCheck, momoCheckStatus, waveCheckSession } from "@/server/payments/mobile-money";
import { getProviderCredentials } from "@/server/vault";

// Webhooks de paiement (cahier §6.1) : endpoints dédiés par provider,
// vérification signature/HMAC sur corps brut, idempotence (WebhookEvent),
// et re-vérification du statut auprès du provider quand la signature seule
// ne suffit pas — un paiement n'est JAMAIS réglé sur une simple notification.

export const dynamic = "force-dynamic";

/** Idempotence : true si l'événement est nouveau (et le réserve), false s'il a déjà été traité. */
async function claimEvent(provider: PaymentProvider, externalId: string): Promise<boolean> {
  try {
    await db.webhookEvent.create({ data: { provider, externalId } });
    return true;
  } catch {
    return false; // contrainte unique : déjà reçu
  }
}

async function markProcessed(provider: PaymentProvider, externalId: string, error?: string): Promise<void> {
  await db.webhookEvent.updateMany({
    where: { provider, externalId },
    data: { processedAt: new Date(), error: error ?? null },
  });
}

const STRIPE_SUB_STATUS: Record<string, "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED"> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "EXPIRED",
  incomplete_expired: "EXPIRED",
};

async function handleStripe(req: Request): Promise<NextResponse> {
  const stripe = stripeClient();
  const whsec = env().STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whsec) return NextResponse.json({ error: "DEFERRED_AWAITING_CREDENTIALS" }, { status: 503 });

  const raw = await req.text(); // corps BRUT — obligatoire pour la signature
  const signature = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, whsec);
  } catch {
    return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 400 });
  }

  if (!(await claimEvent("STRIPE", event.id))) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const paymentId = session.metadata?.paymentId;
        if (!paymentId) break;
        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          const periodEnd = new Date((stripeSub.items.data[0]?.current_period_end ?? 0) * 1000);
          await settlePayment({ paymentId, providerRef: subId, periodEnd });
        } else if (session.payment_status === "paid") {
          await settlePayment({ paymentId, providerRef: session.id });
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : null;
        if (!subId) break;
        const sub = await db.subscription.findFirst({ where: { providerRef: subId } });
        if (!sub) break;
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const periodEnd = new Date((stripeSub.items.data[0]?.current_period_end ?? 0) * 1000);
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: "ACTIVE", currentPeriodEnd: periodEnd },
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object;
        const sub = await db.subscription.findFirst({ where: { providerRef: stripeSub.id } });
        if (!sub) break;
        const mapped = STRIPE_SUB_STATUS[stripeSub.status] ?? "CANCELED";
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: mapped, canceledAt: mapped === "CANCELED" ? new Date() : sub.canceledAt },
        });
        break;
      }
    }
    await markProcessed("STRIPE", event.id);
    return NextResponse.json({ received: true });
  } catch (e) {
    await markProcessed("STRIPE", event.id, e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "PROCESSING_ERROR" }, { status: 500 });
  }
}

async function handleWave(req: Request): Promise<NextResponse> {
  const raw = await req.text();
  const payload = JSON.parse(raw) as { id?: string; type?: string; data?: { id?: string; client_reference?: string } };
  const eventId = payload.id ?? `wave-${payload.data?.id ?? "sans-id"}`;

  // Vérification HMAC (secret vault) sur corps brut si configuré.
  const sessionRef = payload.data?.client_reference;
  const payment = sessionRef ? await db.payment.findUnique({ where: { id: sessionRef } }) : null;
  if (!payment) return NextResponse.json({ received: true, ignored: true });
  const creds = await getProviderCredentials<{ apiKey: string; webhookSecret?: string }>(payment.operatorId, "wave");
  if (creds?.webhookSecret) {
    const header = req.headers.get("wave-signature") ?? "";
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
    const expected = createHmac("sha256", creds.webhookSecret).update(`${parts.t}${raw}`).digest("hex");
    const given = parts.v1 ?? "";
    if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
      return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 400 });
    }
  }

  if (!(await claimEvent("WAVE", eventId))) return NextResponse.json({ received: true, duplicate: true });
  // Re-vérification auprès de Wave avant tout règlement.
  const check = payload.data?.id ? await waveCheckSession(payment.operatorId, payload.data.id) : { paid: false };
  if (check.paid) await settlePayment({ paymentId: payment.id, providerRef: payload.data?.id });
  await markProcessed("WAVE", eventId, check.paid ? undefined : "statut non confirmé");
  return NextResponse.json({ received: true });
}

async function handleMomo(req: Request): Promise<NextResponse> {
  const payload = (await req.json()) as { referenceId?: string; externalId?: string; status?: string };
  const paymentId = payload.externalId ?? payload.referenceId;
  if (!paymentId) return NextResponse.json({ received: true, ignored: true });
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return NextResponse.json({ received: true, ignored: true });
  const eventId = `momo-${paymentId}-${payload.status ?? "cb"}`;
  if (!(await claimEvent("MTN_MOMO", eventId))) return NextResponse.json({ received: true, duplicate: true });
  // Le callback n'est pas signé : on ne fait confiance qu'au statut re-lu via l'API authentifiée.
  const confirmed = await momoCheckStatus(payment.operatorId, paymentId);
  if (confirmed) await settlePayment({ paymentId, providerRef: paymentId });
  await markProcessed("MTN_MOMO", eventId, confirmed ? undefined : "statut non confirmé");
  return NextResponse.json({ received: true });
}

async function handleOrange(req: Request): Promise<NextResponse> {
  const payload = (await req.json()) as { status?: string; notif_token?: string; txnid?: string };
  if (!payload.notif_token) return NextResponse.json({ received: true, ignored: true });
  // Le notif_token a été stocké côté paiement à la création du webpayment.
  const payment = await db.payment.findFirst({
    where: { metadata: { path: ["notifToken"], equals: payload.notif_token } },
  });
  if (!payment) return NextResponse.json({ received: true, ignored: true });
  const eventId = `om-${payload.notif_token}`;
  if (!(await claimEvent("ORANGE_MONEY", eventId))) return NextResponse.json({ received: true, duplicate: true });
  const ok = payload.status === "SUCCESS";
  if (ok) await settlePayment({ paymentId: payment.id, providerRef: payload.txnid });
  await markProcessed("ORANGE_MONEY", eventId, ok ? undefined : `statut ${payload.status}`);
  return NextResponse.json({ received: true });
}

async function handleCinetpay(req: Request): Promise<NextResponse> {
  const form = await req.formData().catch(() => null);
  const transId = form ? String(form.get("cpm_trans_id") ?? "") : "";
  if (!transId) return NextResponse.json({ received: true, ignored: true });
  const payment = await db.payment.findUnique({ where: { id: transId } });
  if (!payment) return NextResponse.json({ received: true, ignored: true });
  const eventId = `cinetpay-${transId}`;
  if (!(await claimEvent("CINETPAY", eventId))) return NextResponse.json({ received: true, duplicate: true });
  // Recommandation CinetPay : re-vérifier via /payment/check avant tout règlement.
  const confirmed = await cinetpayCheck(payment.operatorId, transId);
  if (confirmed) await settlePayment({ paymentId: transId, providerRef: transId });
  await markProcessed("CINETPAY", eventId, confirmed ? undefined : "statut non confirmé");
  return NextResponse.json({ received: true });
}

async function handlePaypal(req: Request): Promise<NextResponse> {
  const payload = (await req.json()) as {
    id?: string;
    event_type?: string;
    resource?: { id?: string; purchase_units?: { reference_id?: string }[]; status?: string };
  };
  const eventId = payload.id ?? "paypal-sans-id";
  const reference = payload.resource?.purchase_units?.[0]?.reference_id;
  if (!reference) return NextResponse.json({ received: true, ignored: true });
  const payment = await db.payment.findUnique({ where: { id: reference } });
  if (!payment) return NextResponse.json({ received: true, ignored: true });
  if (!(await claimEvent("PAYPAL", eventId))) return NextResponse.json({ received: true, duplicate: true });

  // On ne croit pas le webhook : capture (ou relecture) authentifiée côté API.
  const creds = await getProviderCredentials<{ clientId: string; clientSecret: string; sandbox?: boolean }>(
    payment.operatorId,
    "paypal",
  );
  let confirmed = false;
  if (creds && payload.resource?.id) {
    const base = creds.sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (tokenRes.ok) {
      const { access_token } = (await tokenRes.json()) as { access_token: string };
      if (payload.event_type === "CHECKOUT.ORDER.APPROVED") {
        const cap = await fetch(`${base}/v2/checkout/orders/${payload.resource.id}/capture`, {
          method: "POST",
          headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        });
        if (cap.ok) {
          const data = (await cap.json()) as { status?: string };
          confirmed = data.status === "COMPLETED";
        }
      } else {
        const get = await fetch(`${base}/v2/checkout/orders/${payload.resource.id}`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (get.ok) {
          const data = (await get.json()) as { status?: string };
          confirmed = data.status === "COMPLETED";
        }
      }
    }
  }
  if (confirmed) await settlePayment({ paymentId: payment.id, providerRef: payload.resource?.id });
  await markProcessed("PAYPAL", eventId, confirmed ? undefined : "capture non confirmée");
  return NextResponse.json({ received: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  switch (provider) {
    case "stripe":
      return handleStripe(req);
    case "wave":
      return handleWave(req);
    case "mtn-momo":
      return handleMomo(req);
    case "orange-money":
      return handleOrange(req);
    case "cinetpay":
      return handleCinetpay(req);
    case "paypal":
      return handlePaypal(req);
    default:
      return NextResponse.json({ error: "PROVIDER_INCONNU" }, { status: 404 });
  }
}
