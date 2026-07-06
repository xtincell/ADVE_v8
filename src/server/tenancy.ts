import "server-only";
import { cache } from "react";
import { db } from "@/server/db";

// Multi-tenant (cahier §2) : toute donnée métier est rattachée à un opérateur.
// v2.0 opère un tenant principal (UPgraders, seedé) ; l'architecture reste multi-tenant
// (operatorId partout, résolution centralisée ici — un sélecteur d'opérateur se brancherait ici).

const DEFAULT_OPERATOR_SLUG = "upgraders";

/** Opérateur par défaut de l'installation. Cache par requête (React cache). */
export const getDefaultOperator = cache(async () => {
  const op = await db.operator.findUnique({ where: { slug: DEFAULT_OPERATOR_SLUG } });
  if (!op) {
    throw new Error(
      `Opérateur par défaut absent ("${DEFAULT_OPERATOR_SLUG}") — lance \`npm run db:seed\` pour initialiser la base.`,
    );
  }
  return op;
});

