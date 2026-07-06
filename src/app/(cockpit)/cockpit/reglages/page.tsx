import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getVapidPublicKey } from "@/server/notifications/push";
import { ProfileForm } from "./profile-form";
import { NotificationPrefs } from "./notification-prefs";
import { PrivacyActions } from "./privacy-actions";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  const sessionUser = await requireUser("/cockpit/reglages");
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  const countries = await db.country.findMany({
    where: { active: true },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
    select: { code: true, name: true },
  });
  const vapidKey = user.operatorId ? await getVapidPublicKey(user.operatorId) : null;
  const pushCount = await db.pushSubscription.count({ where: { userId: user.id } });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Réglages</p>
        <h1 className="mt-1 text-3xl font-semibold">Profil & préférences</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={user.name ?? ""}
            email={user.email}
            country={user.country ?? ""}
            phone={user.phone ?? ""}
            countries={countries}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Le fil in-app (cloche) est toujours actif — ces réglages concernent les canaux
            complémentaires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPrefs
            digestOptOut={user.digestOptOut}
            vapidPublicKey={vapidKey}
            hasPushSubscription={pushCount > 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vos données (RGPD)</CardTitle>
          <CardDescription>Export complet au format JSON, ou suppression définitive du compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyActions />
        </CardContent>
      </Card>
    </div>
  );
}
