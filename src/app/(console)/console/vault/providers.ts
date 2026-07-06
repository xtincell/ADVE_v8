// Connecteurs par opérateur (cahier §4.3) : les clés vivent chiffrées en base.
// Les secrets SYSTÈME (Stripe, DB, NEXTAUTH) restent en variables d'env.
export const PROVIDERS: { id: string; label: string; fields: { key: string; label: string; secret?: boolean }[] }[] = [
  { id: "wave", label: "Wave (encaissement)", fields: [{ key: "apiKey", label: "Clé API", secret: true }, { key: "webhookSecret", label: "Secret webhook", secret: true }] },
  { id: "mtn_momo", label: "MTN Mobile Money", fields: [{ key: "subscriptionKey", label: "Subscription key", secret: true }, { key: "apiUser", label: "API user" }, { key: "apiKey", label: "API key", secret: true }, { key: "targetEnvironment", label: "Environnement (ex. mtncotedivoire)" }] },
  { id: "orange_money", label: "Orange Money", fields: [{ key: "clientId", label: "Client ID" }, { key: "clientSecret", label: "Client secret", secret: true }, { key: "merchantKey", label: "Merchant key", secret: true }] },
  { id: "cinetpay", label: "CinetPay", fields: [{ key: "apiKey", label: "Clé API", secret: true }, { key: "siteId", label: "Site ID" }] },
  { id: "paypal", label: "PayPal", fields: [{ key: "clientId", label: "Client ID" }, { key: "clientSecret", label: "Client secret", secret: true }, { key: "sandbox", label: "Sandbox (true/false)" }] },
  { id: "resend", label: "Resend (email)", fields: [{ key: "apiKey", label: "Clé API", secret: true }, { key: "from", label: "Expéditeur (ex. La Fusée <no-reply@…>)" }] },
  { id: "mailgun", label: "Mailgun (email)", fields: [{ key: "apiKey", label: "Clé API", secret: true }, { key: "domain", label: "Domaine" }, { key: "from", label: "Expéditeur" }] },
  { id: "sendgrid", label: "SendGrid (email)", fields: [{ key: "apiKey", label: "Clé API", secret: true }, { key: "from", label: "Expéditeur" }] },
  { id: "vapid", label: "Push web (VAPID)", fields: [{ key: "publicKey", label: "Clé publique" }, { key: "privateKey", label: "Clé privée", secret: true }, { key: "subject", label: "Sujet (mailto:…)" }] },
];
