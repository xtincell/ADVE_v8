import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatMoney } from "@/server/billing/pricing";
import { ApplicationForm } from "./application-form";

export const dynamic = "force-dynamic";

export default async function CreatorMissionPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireRole(["TALENT"], "/creator/missions");
  const { slug } = await params;
  const mission = await db.mission.findUnique({ where: { slug } });
  if (!mission || (mission.status !== "PUBLISHED" && mission.status !== "ASSIGNED")) notFound();
  const existing = await db.missionApplication.findUnique({
    where: { missionId_talentId: { missionId: mission.id, talentId: user.id } },
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/creator/missions" className="font-mono text-xs uppercase tracking-widest text-accent hover:underline">
          ← Missions
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">{mission.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{mission.summary}</p>
        <p className="mt-2 font-mono text-sm font-bold">
          {mission.budgetMin != null && mission.budgetMax != null
            ? `${formatMoney(mission.budgetMin, mission.currency)} – ${formatMoney(mission.budgetMax, mission.currency)}`
            : "Budget à discuter"}
        </p>
        <Link href={`/guilde/${mission.slug}`} className="mt-1 inline-block text-xs text-ink-muted underline">
          Voir le brief complet sur le mur public
        </Link>
      </div>

      {existing ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Ma candidature
              <Badge variant={existing.status === "ACCEPTED" ? "success" : existing.status === "REJECTED" ? "danger" : "info"}>
                {existing.status === "SUBMITTED" ? "Envoyée" : existing.status === "SHORTLISTED" ? "Présélection" : existing.status === "ACCEPTED" ? "Retenue 🎉" : existing.status === "REJECTED" ? "Non retenue" : "Retirée"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-muted">{existing.message}</p>
            {existing.quoteAmount != null && (
              <p className="mt-2 font-mono text-sm font-bold">
                Devis : {formatMoney(existing.quoteAmount, mission.currency)}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-faint">
              L&apos;opérateur arbitre les candidatures — vous serez notifié de la décision.
            </p>
          </CardContent>
        </Card>
      ) : mission.status === "PUBLISHED" ? (
        <Card>
          <CardHeader>
            <CardTitle>Candidater avec un devis structuré</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationForm missionId={mission.id} currency={mission.currency} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm italic text-ink-muted">Cette mission a été attribuée.</p>
      )}
    </div>
  );
}
