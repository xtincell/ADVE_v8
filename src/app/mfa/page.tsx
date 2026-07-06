import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { startMfaEnrollment } from "@/server/auth/mfa";
import { MfaEnrollForm } from "./enroll-form";

export const metadata: Metadata = { title: "Activer la double authentification" };
export const dynamic = "force-dynamic";

// Page autonome (hors layout Console) : c'est elle que le garde MFA cible —
// un administrateur sans MFA ne peut rien faire d'autre qu's'enrôler ici.
export default async function MfaPage() {
  const user = await requireUser("/mfa");
  if (user.mfaEnabled) redirect("/console");
  const enrollment = await startMfaEnrollment(user.id);

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Sécurité</p>
      <h1 className="mt-2 text-3xl font-semibold">Double authentification requise</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Votre compte administrateur doit être protégé par un code à usage unique (TOTP). Ajoutez la
        clé ci-dessous dans votre application d&apos;authentification (Google Authenticator, Aegis,
        1Password…), puis confirmez avec le code généré.
      </p>
      <div className="mt-6 rounded-(--radius-md) border border-line bg-surface-raised p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Clé secrète (saisie manuelle)</p>
        <p className="mt-1 break-all font-mono text-lg font-bold tracking-wider">{enrollment.secret}</p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-faint">Lien otpauth</p>
        <p className="mt-1 break-all font-mono text-xs text-ink-muted">{enrollment.otpauthUrl}</p>
      </div>
      <MfaEnrollForm />
    </div>
  );
}
