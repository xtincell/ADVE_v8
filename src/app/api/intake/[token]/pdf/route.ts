import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/guards";
import { checkOneShotGate } from "@/server/billing/gates";
import { buildIntakePdf } from "@/server/pdf/intake-pdf";

// Rapport PDF du diagnostic — gated par l'achat one-shot INTAKE_PDF
// (le token d'intake fait office d'identité pour les acheteurs sans compte).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await db.intakeSession.findUnique({ where: { token } });
  if (!session || (session.status !== "SCORED" && session.status !== "ACTIVATED")) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const user = await getSessionUser();
  const gate = await checkOneShotGate(user, "INTAKE_PDF", { intakeSessionId: session.id });
  if (!gate.allowed) {
    return NextResponse.json(
      { error: gate.code, reason: gate.reason, pending: gate.pending },
      { status: 402 },
    );
  }

  const pdf = await buildIntakePdf(session);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="diagnostic-${(session.brandName ?? "marque").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
