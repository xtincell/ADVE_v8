import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

// Config par opérateur (cahier §4.3) : seuils, taux, numéro WhatsApp, flags.
// Une table clé→JSON, des accesseurs typés — pas de moteur de configuration.

export async function getSetting<T>(operatorId: string, key: string): Promise<T | null> {
  const row = await db.setting.findUnique({ where: { operatorId_key: { operatorId, key } } });
  return row ? (row.value as T) : null;
}

export async function setSetting(operatorId: string, key: string, value: unknown): Promise<void> {
  await db.setting.upsert({
    where: { operatorId_key: { operatorId, key } },
    update: { value: value as Prisma.InputJsonValue },
    create: { operatorId, key, value: value as Prisma.InputJsonValue },
  });
}

export async function getCommissionRates(operatorId: string): Promise<Record<string, number>> {
  return (
    (await getSetting<Record<string, number>>(operatorId, "commission.rates")) ?? {
      APPRENTI: 0.3,
      COMPAGNON: 0.25,
      MAITRE: 0.2,
      ASSOCIE: 0.15,
    }
  );
}
