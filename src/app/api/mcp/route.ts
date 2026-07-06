import { NextRequest, NextResponse } from "next/server";
import { authenticateMcp, recordCall } from "@/server/mcp";
import { findTool, MCP_TOOLS } from "@/server/mcp/tools";
import { checkSubscriptionGate } from "@/server/billing/gates";

// LE endpoint MCP consolidé (cahier §6.2, budget §14 : un seul) — JSON-RPC 2.0
// sur HTTP (transport Streamable HTTP, mode sans état). Auth Bearer par clé API
// hashée ; les appels d'outils sont gatés abonnement et comptés (facturables).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-06-18";
const SUPPORTED_VERSIONS = new Set(["2025-06-18", "2025-03-26", "2024-11-05"]);

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcError(id: string | number | null, code: number, message: string, data?: unknown, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } },
    { status },
  );
}

function rpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateMcp(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: auth.error } },
      { status: auth.status, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "JSON invalide.", undefined, 400);
  }
  if (Array.isArray(body)) {
    return rpcError(null, -32600, "Les requêtes par lot ne sont pas supportées (MCP 2025-06-18).", undefined, 400);
  }
  const id = body.id ?? null;
  const method = body.method ?? "";

  // Notifications (sans réponse attendue)
  if (method.startsWith("notifications/")) {
    return new NextResponse(null, { status: 202 });
  }

  switch (method) {
    case "initialize": {
      const requested = String((body.params?.protocolVersion as string) ?? "");
      return rpcResult(id, {
        protocolVersion: SUPPORTED_VERSIONS.has(requested) ? requested : PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "la-fusee-mcp", version: "2.0.0" },
        instructions:
          "API MCP de La Fusée : lectures réelles des marques du porteur de la clé (scores ADVE/RTIS, piliers, trajectoire) et du mur public de La Guilde. Chaque appel d'outil réussi est facturé au relevé mensuel.",
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      });
    case "tools/call": {
      // Gate premium structuré : la découverte est libre, l'usage est payant.
      const gate = await checkSubscriptionGate(auth.user);
      if (!gate.allowed) {
        return rpcError(id, -32001, gate.reason, {
          code: gate.code,
          requiredTiers: gate.requiredTiers,
          upgradePath: gate.upgradePath,
          pending: gate.pending,
        });
      }
      const name = String((body.params?.name as string) ?? "");
      const tool = findTool(name);
      if (!tool) return rpcError(id, -32602, `Outil inconnu : ${name}`);
      try {
        const { result, brandId } = await tool.run(auth.user, body.params?.arguments ?? {});
        await recordCall(auth.key.id, name, { brandId, ok: true });
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        });
      } catch (e) {
        await recordCall(auth.key.id, name, { ok: false });
        const message = e instanceof Error ? e.message : "Erreur d'exécution de l'outil.";
        // Erreur d'exécution (spec MCP) : résultat isError, pas d'erreur protocole — non facturée.
        return rpcResult(id, { content: [{ type: "text", text: message }], isError: true });
      }
    }
    default:
      return rpcError(id, -32601, `Méthode inconnue : ${method || "(vide)"}`);
  }
}

export async function GET() {
  // Transport sans état : pas de flux serveur→client ouvert (le SSE produit vit sur /api/sse).
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
