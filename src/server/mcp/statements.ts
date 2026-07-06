import "server-only";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { getSetting } from "@/server/settings";

// Relevés MCP mensuels GELÉS (cahier §6.2) : le mois précédent est clos, compté
// et figé (unique keyId+periodStart → idempotent). Le règlement passe par les
// rails de paiement existants (validation manuelle Console).

export const DEFAULT_CALL_PRICE = { amount: 100, currency: "XOF" }; // surchargé par le setting mcp.call_price

/**
 * Gèle les relevés du mois PRÉCÉDANT `reference` (par défaut : maintenant).
 * Un `reference` explicite permet à l'opérateur de rattraper des mois passés —
 * la période gelée est toujours un mois calendaire clos.
 */
export async function freezeMonthlyStatements(reference = new Date()): Promise<{ frozen: number; period: string }> {
  const periodStart = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1));
  const periodEnd = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const period = periodStart.toISOString().slice(0, 7);

  const usage = await db.mcpCall.groupBy({
    by: ["keyId"],
    where: { createdAt: { gte: periodStart, lt: periodEnd }, ok: true },
    _sum: { costUnits: true },
    _count: { _all: true },
  });

  let frozen = 0;
  for (const u of usage) {
    const exists = await db.mcpStatement.findUnique({
      where: { keyId_periodStart: { keyId: u.keyId, periodStart } },
    });
    if (exists) continue; // gelé = gelé, on ne recompte jamais
    const key = await db.mcpApiKey.findUniqueOrThrow({ where: { id: u.keyId } });
    const price =
      (await getSetting<{ amount: number; currency: string }>(key.operatorId, "mcp.call_price")) ??
      DEFAULT_CALL_PRICE;
    const units = u._sum.costUnits ?? 0;
    const statement = await db.mcpStatement.create({
      data: {
        operatorId: key.operatorId,
        keyId: u.keyId,
        periodStart,
        periodEnd,
        callCount: units,
        amount: units * price.amount,
        currency: price.currency,
      },
    });
    await audit({
      operatorId: key.operatorId,
      action: "mcp.statement_freeze",
      entity: "McpStatement",
      entityId: statement.id,
      after: { period, keyPrefix: key.prefix, callCount: units, amount: statement.amount },
    });
    frozen++;
  }
  return { frozen, period };
}
