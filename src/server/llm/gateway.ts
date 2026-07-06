import "server-only";
import { z } from "zod";
import { env } from "@/env";
import { db } from "@/server/db";

// Gateway LLM unique (cahier §9) : multi-provider avec fallback
// Anthropic → OpenAI → Ollama → OpenRouter, clés 100 % env. AUCUNE clé nulle
// part ⇒ llmAvailable() est faux et tout le déterministe fonctionne (§3.5.3).
// Toute sortie de données passe par un schéma Zod + retry — jamais de
// coercition silencieuse. Chaque appel est journalisé (LlmCall).

export type LlmProvider = "anthropic" | "openai" | "ollama" | "openrouter";

const FALLBACK_ORDER: LlmProvider[] = ["anthropic", "openai", "ollama", "openrouter"];

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  ollama: "llama3.2",
  openrouter: "anthropic/claude-haiku-4.5",
};

function configuredProviders(): LlmProvider[] {
  const e = env();
  const available: LlmProvider[] = [];
  if (e.ANTHROPIC_API_KEY) available.push("anthropic");
  if (e.OPENAI_API_KEY) available.push("openai");
  if (e.OLLAMA_BASE_URL) available.push("ollama");
  if (e.OPENROUTER_API_KEY) available.push("openrouter");
  return available;
}

/** Chaîne d'essai : LLM_PRIMARY_PROVIDER d'abord (s'il est configuré), puis l'ordre de fallback. */
export function providerChain(): LlmProvider[] {
  const available = configuredProviders();
  const primary = env().LLM_PRIMARY_PROVIDER;
  const ordered = FALLBACK_ORDER.filter((p) => available.includes(p));
  if (primary && available.includes(primary)) {
    return [primary, ...ordered.filter((p) => p !== primary)];
  }
  return ordered;
}

/** Vrai si au moins un provider est configuré — pilote l'affichage des assists IA. */
export function llmAvailable(): boolean {
  return configuredProviders().length > 0;
}

export class LlmUnavailableError extends Error {
  constructor() {
    super("Aucun provider LLM configuré — les fonctions IA sont désactivées, tout le reste fonctionne.");
  }
}

interface RawCompletion {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

/** Appel brut d'un provider — fetch pur, zéro SDK (portabilité §11.1). */
async function completeWith(
  provider: LlmProvider,
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<RawCompletion> {
  const e = env();
  const model = e.LLM_MODEL || DEFAULT_MODELS[provider];

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": e.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as {
      content: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
    };
    const text = json.content?.map((b) => b.text ?? "").join("") ?? "";
    return {
      text,
      tokensIn: json.usage?.input_tokens ?? 0,
      tokensOut: json.usage?.output_tokens ?? 0,
      model: json.model ?? model,
    };
  }

  if (provider === "ollama") {
    const base = e.OLLAMA_BASE_URL!.replace(/\/$/, "");
    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        options: { num_predict: maxTokens },
      }),
    });
    if (!res.ok) throw new Error(`ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    return {
      text: json.message?.content ?? "",
      tokensIn: json.prompt_eval_count ?? 0,
      tokensOut: json.eval_count ?? 0,
      model,
    };
  }

  // OpenAI et OpenRouter partagent le format chat/completions.
  const url =
    provider === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
  const key = provider === "openai" ? e.OPENAI_API_KEY! : e.OPENROUTER_API_KEY!;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${provider} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };
  return {
    text: json.choices?.[0]?.message?.content ?? "",
    tokensIn: json.usage?.prompt_tokens ?? 0,
    tokensOut: json.usage?.completion_tokens ?? 0,
    model: json.model ?? model,
  };
}

/** Extrait le premier objet/tableau JSON d'une réponse (les modèles emballent parfois en ```json). */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.search(/[[{]/);
  if (start === -1) return text.trim();
  return text.slice(start).trim();
}

export interface LlmCallInput<T> {
  purpose: string; // intake_prefill | adve_reformulate | oracle_enrich | asset_improve | mission_draft
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  operatorId?: string | null;
  brandId?: string | null;
  maxTokens?: number;
}

/**
 * Appel structuré : provider chain avec fallback, parsing Zod avec UN retry
 * ciblé (l'erreur de validation est renvoyée au modèle), journal LlmCall.
 */
export async function callLlm<T>(input: LlmCallInput<T>): Promise<T> {
  const chain = providerChain();
  if (chain.length === 0) throw new LlmUnavailableError();
  const maxTokens = input.maxTokens ?? 1500;
  let lastError: Error | null = null;

  for (const provider of chain) {
    let prompt = input.prompt;
    for (let attempt = 0; attempt < 2; attempt++) {
      let raw: RawCompletion;
      try {
        raw = await completeWith(provider, input.system, prompt, maxTokens);
      } catch (e) {
        // Erreur transport/HTTP → provider suivant (journalisée).
        lastError = e instanceof Error ? e : new Error(String(e));
        await journal(input, provider, null, false, lastError.message);
        break;
      }
      const parsed = safeParseJson(input.schema, raw.text);
      if (parsed.success) {
        await journal(input, provider, raw, true, null);
        return parsed.data;
      }
      // Sortie non conforme : UN retry avec l'erreur explicitée — jamais de coercition.
      lastError = new Error(`Sortie non conforme au schéma : ${parsed.error}`);
      await journal(input, provider, raw, false, parsed.error);
      prompt = `${input.prompt}\n\nTa réponse précédente était invalide (${parsed.error}). Réponds UNIQUEMENT avec le JSON demandé, sans commentaire.`;
    }
  }
  throw lastError ?? new Error("Échec LLM sans détail.");
}

function safeParseJson<T>(
  schema: z.ZodType<T>,
  text: string,
): { success: true; data: T } | { success: false; error: string } {
  let candidate: unknown;
  try {
    candidate = JSON.parse(extractJson(text));
  } catch {
    return { success: false, error: "JSON illisible" };
  }
  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" ; ").slice(0, 300),
    };
  }
  return { success: true, data: parsed.data };
}

async function journal(
  input: LlmCallInput<unknown>,
  provider: LlmProvider,
  raw: RawCompletion | null,
  ok: boolean,
  error: string | null,
): Promise<void> {
  try {
    await db.llmCall.create({
      data: {
        operatorId: input.operatorId ?? null,
        brandId: input.brandId ?? null,
        provider,
        model: raw?.model ?? env().LLM_MODEL ?? DEFAULT_MODELS[provider],
        purpose: input.purpose,
        tokensIn: raw?.tokensIn ?? 0,
        tokensOut: raw?.tokensOut ?? 0,
        ok,
        error: error?.slice(0, 500) ?? null,
      },
    });
  } catch {
    // Le journal ne doit jamais faire échouer l'appel produit.
  }
}
