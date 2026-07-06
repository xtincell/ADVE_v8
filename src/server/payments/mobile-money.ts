import "server-only";
import { env } from "@/env";
import { getProviderCredentials } from "@/server/vault";
import type { CheckoutInput, CheckoutResult, PaymentProviderAdapter } from "./types";

// Rails mobile money (cahier §6.1) : clients HTTP RÉELS vers les API officielles.
// Credentials par opérateur dans le vault chiffré ; sans clés → DEFERRED explicite.
// Un paiement n'est JAMAIS marqué payé ici : seule la confirmation (webhook
// re-vérifié auprès du provider) déclenche settlePayment.

function base(): string {
  return env().NEXT_PUBLIC_BASE_URL;
}

// ── Wave ────────────────────────────────────────────────────────────
interface WaveCreds {
  apiKey: string;
  webhookSecret?: string;
}

export const waveAdapter: PaymentProviderAdapter = {
  id: "WAVE",
  label: "Wave",
  availability: async (operatorId) => {
    const creds = await getProviderCredentials<WaveCreds>(operatorId, "wave");
    return creds?.apiKey
      ? { status: "CONFIGURED" }
      : { status: "DEFERRED_AWAITING_CREDENTIALS", missing: ["wave.apiKey (vault Console)"] };
  },
  createCheckout: async (input: CheckoutInput): Promise<CheckoutResult> => {
    const creds = await getProviderCredentials<WaveCreds>(input.operatorId, "wave");
    if (!creds?.apiKey) return { kind: "deferred", missing: ["wave.apiKey"] };
    const res = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: String(input.amount),
        currency: input.currency,
        client_reference: input.paymentId,
        success_url: input.successUrl,
        error_url: input.cancelUrl,
      }),
    });
    if (!res.ok) throw new Error(`Wave a refusé la création de session (${res.status}) : ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { wave_launch_url?: string };
    if (!data.wave_launch_url) throw new Error("Wave n'a pas retourné d'URL de paiement.");
    return { kind: "redirect", url: data.wave_launch_url };
  },
};

/** Re-vérification serveur→serveur d'une session Wave (webhook non fiable seul). */
export async function waveCheckSession(operatorId: string, sessionId: string): Promise<{ paid: boolean; reference: string | null }> {
  const creds = await getProviderCredentials<WaveCreds>(operatorId, "wave");
  if (!creds?.apiKey) return { paid: false, reference: null };
  const res = await fetch(`https://api.wave.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${creds.apiKey}` },
  });
  if (!res.ok) return { paid: false, reference: null };
  const data = (await res.json()) as { payment_status?: string; client_reference?: string };
  return { paid: data.payment_status === "succeeded", reference: data.client_reference ?? null };
}

// ── MTN Mobile Money (Collections) ─────────────────────────────────
interface MomoCreds {
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  targetEnvironment?: string; // sandbox | mtncotedivoire | mtncameroon…
}

const MOMO_BASE = "https://proxy.momoapi.mtn.com";

async function momoToken(creds: MomoCreds): Promise<string> {
  const res = await fetch(`${MOMO_BASE}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.apiUser}:${creds.apiKey}`).toString("base64")}`,
      "Ocp-Apim-Subscription-Key": creds.subscriptionKey,
    },
  });
  if (!res.ok) throw new Error(`MTN MoMo : échec d'authentification (${res.status}).`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export const momoAdapter: PaymentProviderAdapter = {
  id: "MTN_MOMO",
  label: "MTN Mobile Money",
  availability: async (operatorId) => {
    const creds = await getProviderCredentials<MomoCreds>(operatorId, "mtn_momo");
    if (creds?.subscriptionKey && creds.apiUser && creds.apiKey) return { status: "CONFIGURED" };
    return { status: "DEFERRED_AWAITING_CREDENTIALS", missing: ["mtn_momo.subscriptionKey / apiUser / apiKey (vault Console)"] };
  },
  createCheckout: async (input): Promise<CheckoutResult> => {
    const creds = await getProviderCredentials<MomoCreds>(input.operatorId, "mtn_momo");
    if (!creds?.subscriptionKey) return { kind: "deferred", missing: ["mtn_momo.*"] };
    const token = await momoToken(creds);
    // Request-to-pay : le payeur confirme sur son téléphone ; le statut est
    // re-vérifié via l'API avant tout règlement (webhook/cron).
    const res = await fetch(`${MOMO_BASE}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Ocp-Apim-Subscription-Key": creds.subscriptionKey,
        "X-Reference-Id": input.paymentId,
        "X-Target-Environment": creds.targetEnvironment ?? "sandbox",
        "X-Callback-Url": `${base()}/api/webhooks/mtn-momo`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(input.amount),
        currency: input.currency,
        externalId: input.paymentId,
        payer: { partyIdType: "MSISDN", partyId: "" }, // saisi côté page de paiement provider
        payerMessage: `La Fusée — ${input.tier}`,
        payeeNote: input.paymentId,
      }),
    });
    if (!res.ok && res.status !== 202) {
      throw new Error(`MTN MoMo a refusé la demande de paiement (${res.status}).`);
    }
    return { kind: "redirect", url: `${input.successUrl}&attente=momo` };
  },
};

export async function momoCheckStatus(operatorId: string, referenceId: string): Promise<boolean> {
  const creds = await getProviderCredentials<MomoCreds>(operatorId, "mtn_momo");
  if (!creds?.subscriptionKey) return false;
  const token = await momoToken(creds);
  const res = await fetch(`${MOMO_BASE}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": creds.subscriptionKey,
      "X-Target-Environment": creds.targetEnvironment ?? "sandbox",
    },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { status?: string };
  return data.status === "SUCCESSFUL";
}

// ── Orange Money (Web Payment) ──────────────────────────────────────
interface OrangeCreds {
  clientId: string;
  clientSecret: string;
  merchantKey: string;
}

export const orangeAdapter: PaymentProviderAdapter = {
  id: "ORANGE_MONEY",
  label: "Orange Money",
  availability: async (operatorId) => {
    const creds = await getProviderCredentials<OrangeCreds>(operatorId, "orange_money");
    if (creds?.clientId && creds.clientSecret && creds.merchantKey) return { status: "CONFIGURED" };
    return { status: "DEFERRED_AWAITING_CREDENTIALS", missing: ["orange_money.clientId / clientSecret / merchantKey (vault Console)"] };
  },
  createCheckout: async (input): Promise<CheckoutResult> => {
    const creds = await getProviderCredentials<OrangeCreds>(input.operatorId, "orange_money");
    if (!creds?.clientId) return { kind: "deferred", missing: ["orange_money.*"] };
    const tokenRes = await fetch("https://api.orange.com/oauth/v3/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok) throw new Error(`Orange Money : échec d'authentification (${tokenRes.status}).`);
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const res = await fetch("https://api.orange.com/orange-money-webpay/v1/webpayment", {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_key: creds.merchantKey,
        currency: input.currency === "XOF" ? "OUV" : input.currency,
        order_id: input.paymentId,
        amount: input.amount,
        return_url: input.successUrl,
        cancel_url: input.cancelUrl,
        notif_url: `${base()}/api/webhooks/orange-money`,
        lang: "fr",
        reference: `La Fusée — ${input.tier}`,
      }),
    });
    if (!res.ok) throw new Error(`Orange Money a refusé le paiement (${res.status}).`);
    const data = (await res.json()) as { payment_url?: string; pay_token?: string; notif_token?: string };
    if (!data.payment_url) throw new Error("Orange Money n'a pas retourné d'URL de paiement.");
    // Les tokens servent à authentifier la notification (webhook) et la relecture de statut.
    const { db } = await import("@/server/db");
    await db.payment.update({
      where: { id: input.paymentId },
      data: { metadata: { notifToken: data.notif_token ?? null, payToken: data.pay_token ?? null } },
    });
    return { kind: "redirect", url: data.payment_url };
  },
};

/**
 * Relecture serveur→serveur du statut d'une transaction Orange (règle d'or §6) :
 * le webhook n'ouvre JAMAIS de droit sur le seul statut auto-déclaré du callback.
 * Réauthentifie et interroge /transactionstatus avec le payToken stocké.
 */
export async function orangeCheckStatus(
  operatorId: string,
  input: { orderId: string; amount: number; payToken: string | null },
): Promise<boolean> {
  if (!input.payToken) return false;
  const creds = await getProviderCredentials<OrangeCreds>(operatorId, "orange_money");
  if (!creds?.clientId) return false;
  const tokenRes = await fetch("https://api.orange.com/oauth/v3/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) return false;
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const res = await fetch("https://api.orange.com/orange-money-webpay/v1/transactionstatus", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: input.orderId, amount: input.amount, pay_token: input.payToken }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { status?: string };
  return data.status === "SUCCESS";
}

// ── CinetPay (alternatif multi-pays) ────────────────────────────────
interface CinetCreds {
  apiKey: string;
  siteId: string;
}

export const cinetpayAdapter: PaymentProviderAdapter = {
  id: "CINETPAY",
  label: "CinetPay",
  availability: async (operatorId) => {
    const creds = await getProviderCredentials<CinetCreds>(operatorId, "cinetpay");
    return creds?.apiKey && creds.siteId
      ? { status: "CONFIGURED" }
      : { status: "DEFERRED_AWAITING_CREDENTIALS", missing: ["cinetpay.apiKey / siteId (vault Console)"] };
  },
  createCheckout: async (input): Promise<CheckoutResult> => {
    const creds = await getProviderCredentials<CinetCreds>(input.operatorId, "cinetpay");
    if (!creds?.apiKey) return { kind: "deferred", missing: ["cinetpay.*"] };
    const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: creds.apiKey,
        site_id: creds.siteId,
        transaction_id: input.paymentId,
        amount: input.amount,
        currency: input.currency,
        description: `La Fusée — ${input.tier}`,
        notify_url: `${base()}/api/webhooks/cinetpay`,
        return_url: input.successUrl,
        channels: "ALL",
      }),
    });
    if (!res.ok) throw new Error(`CinetPay a refusé le paiement (${res.status}).`);
    const data = (await res.json()) as { data?: { payment_url?: string } };
    if (!data.data?.payment_url) throw new Error("CinetPay n'a pas retourné d'URL de paiement.");
    return { kind: "redirect", url: data.data.payment_url };
  },
};

export async function cinetpayCheck(operatorId: string, transactionId: string): Promise<boolean> {
  const creds = await getProviderCredentials<CinetCreds>(operatorId, "cinetpay");
  if (!creds?.apiKey) return false;
  const res = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: creds.apiKey, site_id: creds.siteId, transaction_id: transactionId }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { data?: { status?: string } };
  return data.data?.status === "ACCEPTED";
}

// ── PayPal (diaspora) ───────────────────────────────────────────────
interface PaypalCreds {
  clientId: string;
  clientSecret: string;
  sandbox?: boolean;
}

function paypalBase(creds: PaypalCreds): string {
  return creds.sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

export const paypalAdapter: PaymentProviderAdapter = {
  id: "PAYPAL",
  label: "PayPal",
  availability: async (operatorId) => {
    const creds = await getProviderCredentials<PaypalCreds>(operatorId, "paypal");
    return creds?.clientId && creds.clientSecret
      ? { status: "CONFIGURED" }
      : { status: "DEFERRED_AWAITING_CREDENTIALS", missing: ["paypal.clientId / clientSecret (vault Console)"] };
  },
  createCheckout: async (input): Promise<CheckoutResult> => {
    const creds = await getProviderCredentials<PaypalCreds>(input.operatorId, "paypal");
    if (!creds?.clientId) return { kind: "deferred", missing: ["paypal.*"] };
    if (input.currency !== "EUR" && input.currency !== "USD") {
      return { kind: "deferred", missing: ["PayPal ne traite pas le FCFA — réservé à la zone diaspora"] };
    }
    const tokenRes = await fetch(`${paypalBase(creds)}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok) throw new Error(`PayPal : échec d'authentification (${tokenRes.status}).`);
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const res = await fetch(`${paypalBase(creds)}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.paymentId,
            amount: { currency_code: input.currency, value: (input.amount / 100).toFixed(2) },
            description: `La Fusée — ${input.tier}`,
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: input.successUrl,
              cancel_url: input.cancelUrl,
              user_action: "PAY_NOW",
            },
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`PayPal a refusé la commande (${res.status}).`);
    const data = (await res.json()) as { links?: { rel: string; href: string }[] };
    const approve = data.links?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!approve) throw new Error("PayPal n'a pas retourné de lien d'approbation.");
    return { kind: "redirect", url: approve.href };
  },
};
