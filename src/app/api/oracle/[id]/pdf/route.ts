import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { db } from "@/server/db";
import { getReportWithSections } from "@/server/oracle/generate";
import { buildOraclePdf } from "@/server/pdf/oracle-pdf";

// Export PDF de l'Oracle — généré à la volée, jamais stocké (cahier §11.1.6).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const report = await getReportWithSections(id);
  if (!report) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const brand = await getOwnedBrand(user, report.brandId);
  if (!brand) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const pdf = await buildOraclePdf(report);
  await db.oracleReport.update({ where: { id }, data: { lastExportedAt: new Date() } });

  const filename = `oracle-${report.brand.slug}-v${report.version}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
