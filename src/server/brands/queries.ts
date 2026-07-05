import "server-only";
import type { Brand, PillarKind } from "@prisma/client";
import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/guards";
import { hasRole } from "@/server/auth/guards";

// Lectures de marque avec contrôle d'accès : un founder n'accède qu'à ses marques ;
// un operator/admin accède aux marques de son tenant.

export async function getOwnedBrand(user: SessionUser, brandId?: string): Promise<Brand | null> {
  if (brandId) {
    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand) return null;
    if (brand.founderId === user.id) return brand;
    if (hasRole(user, ["OPERATOR"]) && brand.operatorId === user.operatorId) return brand;
    if (user.roles.includes("ADMIN")) return brand;
    return null;
  }
  return db.brand.findFirst({
    where: { founderId: user.id, isShell: false },
    orderBy: { createdAt: "asc" },
  });
}

export async function getBrandWithPillars(user: SessionUser, brandId?: string) {
  const brand = await getOwnedBrand(user, brandId);
  if (!brand) return null;
  const pillars = await db.pillar.findMany({ where: { brandId: brand.id } });
  return { brand, pillars };
}

export async function getPillarWithHistory(user: SessionUser, kind: PillarKind, brandId?: string) {
  const brand = await getOwnedBrand(user, brandId);
  if (!brand) return null;
  const pillar = await db.pillar.findUnique({ where: { brandId_kind: { brandId: brand.id, kind } } });
  const versions = pillar
    ? await db.pillarVersion.findMany({
        where: { pillarId: pillar.id },
        orderBy: { version: "desc" },
        take: 20,
      })
    : [];
  return { brand, pillar, versions };
}
