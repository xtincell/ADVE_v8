import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PlanTier } from "@prisma/client";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { getDefaultOperator } from "@/server/tenancy";
import { priceFor, TIER_NAMES } from "@/server/billing/pricing";
import { RECURRING_TIERS } from "@/server/billing/gates";
import { providerOptions } from "@/server/payments";
import { CheckoutPanel } from "./checkout-panel";

export const metadata: Metadata = { title: "Paiement" };
export const dynamic = "force-dynamic";

const OFFERS: PlanTier[] = ["INTAKE_PDF", "ORACLE_FULL", "COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"];

export default async function PaiementPage({
  searchParams,
}: {
  searchParams: Promise<{ offre?: string; token?: string; marque?: string }>;
}) {
  const { offre, token, marque } = await searchParams;
  if (!offre || !OFFERS.includes(offre as PlanTier)) notFound();
  const tier = offre as PlanTier;
  const operator = await getDefaultOperator();
  const user = await getSessionUser();

  // Contexte d'achat → pays pour la localisation du prix et du routing.
  let countryCode: string | null | undefined;
  let contextLabel = "";
  if (token) {
    const session = await db.intakeSession.findUnique({ where: { token } });
    if (!session) notFound();
    countryCode = (session.answers as { country?: string }).country;
    contextLabel = session.brandName ? `pour ${session.brandName}` : "";
  } else if (marque && user) {
    const brand = await getOwnedBrand(user, marque);
    if (!brand) notFound();
    countryCode = brand.country;
    contextLabel = `pour ${brand.name}`;
  } else if (user) {
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    countryCode = dbUser?.country;
  }

  const price = await priceFor(operator.id, tier, countryCode);
  if (!price) notFound();
  const providers = await providerOptions(operator.id, countryCode);
  const recurring = RECURRING_TIERS.includes(tier);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Paiement</p>
      <h1 className="mt-2 text-3xl font-semibold">{TIER_NAMES[tier]}</h1>
      {contextLabel && <p className="mt-1 text-sm text-ink-muted">{contextLabel}</p>}
      <p className="mt-4 font-mono text-3xl font-bold">
        {price.formatted}
        {recurring && !price.onQuote && <span className="text-base font-normal text-ink-muted"> /mois</span>}
      </p>
      <p className="mt-1 text-xs text-ink-faint">
        Zone tarifaire {price.zone} · {recurring ? "abonnement mensuel sans engagement" : "achat one-shot"}
      </p>

      <CheckoutPanel
        offre={tier}
        token={token ?? ""}
        marque={marque ?? ""}
        providers={providers.map((p) => ({
          id: p.id,
          label: p.label,
          deferred: p.availability.status === "DEFERRED_AWAITING_CREDENTIALS",
          missing: p.availability.status === "DEFERRED_AWAITING_CREDENTIALS" ? p.availability.missing : [],
        }))}
      />

      <p className="mt-8 text-xs text-ink-faint">
        Paiement sécurisé. Un paiement manuel n&apos;ouvre aucun droit avant validation par un
        opérateur — voir <a href="/legal/cgv" className="underline">CGV</a>.
      </p>
    </div>
  );
}
