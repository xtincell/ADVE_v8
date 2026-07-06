import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/server/db";
import { ProfilForm } from "./profil-form";

export const dynamic = "force-dynamic";

const TIER_LABELS: Record<string, string> = {
  APPRENTI: "Apprenti",
  COMPAGNON: "Compagnon",
  MAITRE: "Maître",
  ASSOCIE: "Associé",
};

export default async function CreatorProfilPage() {
  const user = await requireRole(["TALENT"], "/creator/profil");
  const profile = await db.talentProfile.findUnique({ where: { userId: user.id } });
  const countries = await db.country.findMany({
    where: { active: true },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
    select: { code: true, name: true },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Creator · Profil</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-semibold">
          Mon profil talent
          {profile && <Badge variant="gold">{TIER_LABELS[profile.tier] ?? profile.tier}</Badge>}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Ce profil alimente l&apos;annuaire public de La Guilde. Votre tier (et son taux de
          commission) évolue avec les missions réussies — il est arbitré par l&apos;opérateur.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations publiques</CardTitle>
          <CardDescription>Visible sur l&apos;annuaire — le WhatsApp reste privé (opérateur uniquement).</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilForm
            defaults={{
              headline: profile?.headline ?? "",
              bio: profile?.bio ?? "",
              skills: (profile?.skills ?? []).join(", "),
              city: profile?.city ?? "",
              country: profile?.country ?? "",
              whatsapp: profile?.whatsapp ?? "",
              available: profile?.available ?? true,
            }}
            countries={countries}
          />
        </CardContent>
      </Card>
    </div>
  );
}
