import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { getIntakeSession, type IntakeAnswers } from "@/server/intake";
import { DiagnosticWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function DiagnosticTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getIntakeSession(token);
  if (!session) notFound();
  if (session.status === "SCORED" || session.status === "ACTIVATED") {
    redirect(`/diagnostic/${token}/resultat`);
  }
  const countries = await db.country.findMany({
    where: { active: true },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
    select: { code: true, name: true },
  });
  return (
    <DiagnosticWizard
      token={token}
      initialAnswers={(session.answers ?? {}) as Partial<IntakeAnswers>}
      countries={countries}
    />
  );
}
