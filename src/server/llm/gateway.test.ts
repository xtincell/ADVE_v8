import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Le journal LlmCall ne doit jamais toucher une vraie base en test unitaire.
vi.mock("@/server/db", () => ({
  db: { llmCall: { create: vi.fn().mockResolvedValue({}) } },
}));

const BASE_ENV = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  NEXTAUTH_SECRET: "0123456789abcdef",
  NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
};

const schema = z.object({ titre: z.string().min(1) });

/** Recharge le module gateway avec un process.env contrôlé (env() est mis en cache). */
async function loadGateway(extraEnv: Record<string, string | undefined>) {
  vi.resetModules();
  for (const key of [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "OLLAMA_BASE_URL",
    "OPENROUTER_API_KEY",
    "LLM_PRIMARY_PROVIDER",
    "LLM_MODEL",
  ]) {
    delete process.env[key];
  }
  Object.assign(process.env, BASE_ENV, extraEnv);
  return import("./gateway");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function anthropicBody(text: string) {
  return { content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 5 }, model: "claude-test" };
}

function openaiBody(text: string) {
  return { choices: [{ message: { content: text } }], usage: { prompt_tokens: 8, completion_tokens: 4 }, model: "gpt-test" };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("Gateway LLM (cahier §9)", () => {
  it("zéro clé configurée : indisponible, erreur claire — le déterministe n'est jamais bloqué", async () => {
    const g = await loadGateway({});
    expect(g.llmAvailable()).toBe(false);
    expect(g.providerChain()).toEqual([]);
    await expect(
      g.callLlm({ purpose: "test", system: "s", prompt: "p", schema }),
    ).rejects.toBeInstanceOf(g.LlmUnavailableError);
  });

  it("fallback : le provider primaire en erreur HTTP passe la main au suivant", async () => {
    const g = await loadGateway({ ANTHROPIC_API_KEY: "k1", OPENAI_API_KEY: "k2" });
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        if (String(url).includes("anthropic")) return new Response("boom", { status: 500 });
        return jsonResponse(openaiBody(JSON.stringify({ titre: "Depuis OpenAI" })));
      }),
    );
    const out = await g.callLlm({ purpose: "test", system: "s", prompt: "p", schema });
    expect(out).toEqual({ titre: "Depuis OpenAI" });
    expect(calls[0]).toContain("api.anthropic.com");
    expect(calls[1]).toContain("api.openai.com");
  });

  it("OPENAI_BASE_URL : le provider openai vise un endpoint compatible (ex. Ollama Cloud)", async () => {
    const g = await loadGateway({
      OPENAI_API_KEY: "k-cloud",
      OPENAI_BASE_URL: "https://ollama.com/v1",
      LLM_MODEL: "deepseek-v4-flash",
    });
    let seenUrl = "";
    let seenAuth = "";
    let seenModel = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        seenUrl = String(url);
        seenAuth = String((init?.headers as Record<string, string>)?.authorization ?? "");
        seenModel = JSON.parse(String(init?.body ?? "{}")).model as string;
        return jsonResponse(openaiBody(JSON.stringify({ titre: "Depuis Ollama Cloud" })));
      }),
    );
    const out = await g.callLlm({ purpose: "test", system: "s", prompt: "p", schema });
    expect(out).toEqual({ titre: "Depuis Ollama Cloud" });
    expect(seenUrl).toBe("https://ollama.com/v1/chat/completions");
    expect(seenAuth).toBe("Bearer k-cloud");
    expect(seenModel).toBe("deepseek-v4-flash");
  });

  it("LLM_PRIMARY_PROVIDER réordonne la chaîne", async () => {
    const g = await loadGateway({
      ANTHROPIC_API_KEY: "k1",
      OPENAI_API_KEY: "k2",
      LLM_PRIMARY_PROVIDER: "openai",
    });
    expect(g.providerChain()).toEqual(["openai", "anthropic"]);
  });

  it("sortie non conforme : UN retry avec l'erreur explicitée, jamais de coercition", async () => {
    const g = await loadGateway({ ANTHROPIC_API_KEY: "k1" });
    const bodies: string[] = [];
    let attempt = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(String(init?.body ?? ""));
        attempt++;
        if (attempt === 1) return jsonResponse(anthropicBody("Voici : pas du JSON"));
        return jsonResponse(anthropicBody('```json\n{"titre": "Corrigé"}\n```'));
      }),
    );
    const out = await g.callLlm({ purpose: "test", system: "s", prompt: "p", schema });
    expect(out).toEqual({ titre: "Corrigé" });
    expect(attempt).toBe(2);
    expect(bodies[1]).toContain("réponse précédente était invalide");
  });

  it("échec de schéma persistant : erreur explicite (pas de données inventées)", async () => {
    const g = await loadGateway({ ANTHROPIC_API_KEY: "k1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(anthropicBody('{"mauvaisChamp": true}'))),
    );
    await expect(g.callLlm({ purpose: "test", system: "s", prompt: "p", schema })).rejects.toThrow(
      /Sortie non conforme/,
    );
  });

  it("extractJson : fences markdown et préambules sont tolérés", async () => {
    const g = await loadGateway({});
    expect(g.extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(g.extractJson('Bien sûr ! Voici :\n{"a":1}')).toBe('{"a":1}');
    expect(g.extractJson('[{"a":1}]')).toBe('[{"a":1}]');
  });
});
