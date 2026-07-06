import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/guards";

// Export RGPD (cahier §11.2) : toutes les données rattachées au compte, en JSON.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const [profile, brands, notifications, payments, subscriptions, applications, talentProfile, agencyProfile, invoicesToMe] =
    await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: { email: true, name: true, country: true, phone: true, locale: true, roles: true, createdAt: true },
      }),
      db.brand.findMany({
        where: { founderId: user.id },
        include: { pillars: true, snapshots: { take: 50, orderBy: { createdAt: "desc" } }, sources: true, actions: true },
      }),
      db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      db.payment.findMany({ where: { userId: user.id } }),
      db.subscription.findMany({ where: { userId: user.id } }),
      db.missionApplication.findMany({ where: { talentId: user.id } }),
      db.talentProfile.findUnique({ where: { userId: user.id } }),
      db.agencyProfile.findUnique({ where: { userId: user.id } }),
      db.invoice.findMany({ where: { payment: { userId: user.id } } }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    format: "la-fusee/export-v1",
    profile,
    brands,
    notifications,
    payments,
    subscriptions,
    applications,
    talentProfile,
    agencyProfile,
    invoices: invoicesToMe,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="la-fusee-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
