import "server-only";
import { db } from "@/server/db";
import { getProviderCredentials } from "@/server/vault";

// Email transactionnel (cahier §7) : cascade Resend → Mailgun → SendGrid selon
// les clés présentes dans le vault opérateur. Templates typés en code (pas de
// table d'édition — sobriété). Sans clé : EmailLog DEFERRED, jamais d'échec muet.

export type EmailTemplate =
  | "bienvenue"
  | "paiement_confirme"
  | "abonnement_active"
  | "mission_publiee"
  | "mission_rejetee"
  | "candidature_decidee"
  | "digest_hebdo";

interface TemplateDef {
  subject: (d: Record<string, string>) => string;
  text: (d: Record<string, string>) => string;
}

const FOOTER = "\n\n— La Fusée by UPgraders · De la poussière à l'étoile";

const EMAIL_TEMPLATES: Record<EmailTemplate, TemplateDef> = {
  bienvenue: {
    subject: () => "Bienvenue dans votre Cockpit La Fusée",
    text: (d) =>
      `Bonjour ${d.name},\n\nVotre espace est prêt : votre marque « ${d.brand} » est dans le Cockpit, avec son score de départ ${d.score}/200.\n\nProchaine étape : complétez vos piliers — chaque champ rempli fait monter le score.\n${d.url}/cockpit${FOOTER}`,
  },
  paiement_confirme: {
    subject: (d) => `Paiement confirmé — facture ${d.invoice}`,
    text: (d) =>
      `Bonjour ${d.name},\n\nVotre paiement ${d.tier} (${d.amount}) est confirmé. Votre facture ${d.invoice} est disponible dans votre espace.\n${d.url}/cockpit/abonnement${FOOTER}`,
  },
  abonnement_active: {
    subject: () => "Votre abonnement est actif",
    text: (d) =>
      `Bonjour ${d.name},\n\nVotre abonnement ${d.tier} est actif jusqu'au ${d.until}. Les fonctions premium sont débloquées.\n${d.url}/cockpit${FOOTER}`,
  },
  mission_publiee: {
    subject: (d) => `Votre mission « ${d.title} » est publiée`,
    text: (d) =>
      `Bonjour ${d.name},\n\nVotre mission est en ligne sur La Guilde. Les talents candidatent avec des devis structurés ; l'opérateur UPgraders vous présentera la sélection.\n${d.url}/guilde/${d.slug}${FOOTER}`,
  },
  mission_rejetee: {
    subject: (d) => `Votre mission « ${d.title} » n'a pas été publiée`,
    text: (d) =>
      `Bonjour ${d.name},\n\nAprès modération, votre mission n'a pas été publiée. Motif : ${d.reason}.\n\nVous pouvez la redéposer en tenant compte de ce retour : ${d.url}/guilde/deposer${FOOTER}`,
  },
  candidature_decidee: {
    subject: (d) => `Votre candidature — ${d.decision}`,
    text: (d) =>
      `Bonjour ${d.name},\n\nVotre candidature sur « ${d.title} » : ${d.decision}.\n${d.url}/creator${FOOTER}`,
  },
  digest_hebdo: {
    subject: (d) => `${d.count} notification(s) en attente dans votre Cockpit`,
    text: (d) =>
      `Bonjour ${d.name},\n\nVotre récap de la semaine :\n\n${d.items}\n\nTout est dans votre Cockpit : ${d.url}/cockpit${FOOTER}`,
  },
};

interface ProviderResult {
  ok: boolean;
  provider: string;
  error?: string;
}

async function viaResend(operatorId: string, to: string, subject: string, text: string): Promise<ProviderResult | null> {
  const creds = await getProviderCredentials<{ apiKey: string; from?: string }>(operatorId, "resend");
  if (!creds?.apiKey) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: creds.from ?? "La Fusée <onboarding@resend.dev>", to: [to], subject, text }),
  });
  return { ok: res.ok, provider: "resend", error: res.ok ? undefined : `HTTP ${res.status}` };
}

async function viaMailgun(operatorId: string, to: string, subject: string, text: string): Promise<ProviderResult | null> {
  const creds = await getProviderCredentials<{ apiKey: string; domain: string; from?: string }>(operatorId, "mailgun");
  if (!creds?.apiKey || !creds.domain) return null;
  const form = new URLSearchParams({
    from: creds.from ?? `La Fusée <no-reply@${creds.domain}>`,
    to,
    subject,
    text,
  });
  const res = await fetch(`https://api.mailgun.net/v3/${creds.domain}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`api:${creds.apiKey}`).toString("base64")}` },
    body: form,
  });
  return { ok: res.ok, provider: "mailgun", error: res.ok ? undefined : `HTTP ${res.status}` };
}

async function viaSendgrid(operatorId: string, to: string, subject: string, text: string): Promise<ProviderResult | null> {
  const creds = await getProviderCredentials<{ apiKey: string; from?: string }>(operatorId, "sendgrid");
  if (!creds?.apiKey) return null;
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${creds.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: creds.from ?? "no-reply@upgraders.com", name: "La Fusée" },
      subject,
      content: [{ type: "text/plain", value: text }],
    }),
  });
  return { ok: res.ok, provider: "sendgrid", error: res.ok ? undefined : `HTTP ${res.status}` };
}

/** Envoie via la cascade ; trace TOUJOURS le résultat (SENT / FAILED / DEFERRED). */
export async function sendEmail(
  operatorId: string,
  template: EmailTemplate,
  to: string,
  data: Record<string, string>,
): Promise<void> {
  const def = EMAIL_TEMPLATES[template];
  const subject = def.subject(data);
  const text = def.text(data);

  const attempts = [viaResend, viaMailgun, viaSendgrid];
  let lastError: string | undefined;
  for (const attempt of attempts) {
    let result: ProviderResult | null = null;
    try {
      result = await attempt(operatorId, to, subject, text);
    } catch (e) {
      result = { ok: false, provider: attempt.name, error: e instanceof Error ? e.message : String(e) };
    }
    if (result === null) continue; // provider non configuré → suivant
    if (result.ok) {
      await db.emailLog.create({
        data: { operatorId, toEmail: to, template, subject, provider: result.provider, status: "SENT", sentAt: new Date() },
      });
      return;
    }
    lastError = `${result.provider}: ${result.error}`;
  }

  await db.emailLog.create({
    data: {
      operatorId,
      toEmail: to,
      template,
      subject,
      status: lastError ? "FAILED" : "DEFERRED",
      error: lastError ?? "DEFERRED_AWAITING_CREDENTIALS — aucun provider email configuré (vault)",
    },
  });
}
