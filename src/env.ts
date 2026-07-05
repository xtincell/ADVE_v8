import "server-only";
import { z } from "zod";

// Config 100 % env (cahier §11.1). Validée au premier accès runtime — jamais au build.
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXT_PUBLIC_BASE_URL: z.string().url(),

  // Auth optionnelle
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOD_MODE_EMAILS: z
    .string()
    .default("xtincell@gmail.com,alexandre@upgraders.com,x-tincell@hotmail.fr,nefer@upgraders.io"),

  // Vault (défaut : dérivé de NEXTAUTH_SECRET)
  VAULT_SECRET: z.string().optional(),

  // Paiements — secrets SYSTÈME (les connecteurs opérateur vivent dans le vault DB)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MANUAL_PAYMENT_WHATSAPP_NUMBER: z.string().optional(),

  // LLM (tous optionnels — l'app fonctionne sans)
  LLM_PRIMARY_PROVIDER: z.enum(["anthropic", "openai", "ollama", "openrouter"]).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),

  // Crons HTTP
  CRON_SECRET: z.string().optional(),

  // Stockage fichiers (fallback : local/base64)
  BLOB_STORAGE_PUT_URL_TEMPLATE: z.string().optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Variables d'environnement invalides ou manquantes : ${missing}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function godModeEmails(): string[] {
  return env()
    .GOD_MODE_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isGodMode(email: string | null | undefined): boolean {
  return !!email && godModeEmails().includes(email.toLowerCase());
}
