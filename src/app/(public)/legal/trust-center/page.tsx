import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Trust center" };

const PILLARS = [
  {
    title: "Vos données restent les vôtres",
    items: [
      "Vous êtes propriétaire de tout ce que vous déclarez ; export complet disponible depuis vos réglages.",
      "Aucune revente, aucun profilage publicitaire, aucun entraînement d'IA sur vos contenus.",
      "Suppression de compte en libre-service, purge sous 90 jours.",
    ],
  },
  {
    title: "Honnêteté des calculs",
    items: [
      "Le score /200 est 100 % déterministe : mêmes données, même score — c'est testé dans le code.",
      "Une donnée absente est affichée absente : la plateforme ne comble jamais un trou par une invention.",
      "Tout contenu pré-rempli par assistance IA est badgé « à valider » jusqu'à votre validation.",
    ],
  },
  {
    title: "Sécurité technique",
    items: [
      "TLS en transit, mots de passe hachés bcrypt, secrets de connecteurs chiffrés AES-256-GCM.",
      "Double authentification (TOTP) obligatoire pour tout administrateur.",
      "Journal d'audit horodaté des opérations sensibles (paiements, modération, amendements).",
      "Cloisonnement des données par opérateur (multi-tenant).",
    ],
  },
  {
    title: "Argent",
    items: [
      "Cartes traitées par Stripe — vos numéros de carte ne touchent jamais nos serveurs.",
      "Mobile money via les API officielles des opérateurs ; un paiement n'est « payé » que confirmé.",
      "Paiement manuel WhatsApp : validation humaine explicite avant toute ouverture de droits.",
      "Webhooks signés et idempotents : pas de double débit, pas de faux positif.",
    ],
  },
  {
    title: "Continuité",
    items: [
      "Sauvegardes quotidiennes, rétention 14 jours, objectifs RPO 24 h / RTO 12 h ouvrées.",
      "Architecture portable : n'importe quel hôte Node.js 22 + PostgreSQL 16 peut faire tourner la plateforme.",
      "Page Statut publique avec l'état du service en temps réel.",
    ],
  },
  {
    title: "Sous-traitants",
    items: [
      "Hébergement applicatif et base de données : [À COMPLÉTER : hébergeur retenu par l'opérateur].",
      "Paiements : Stripe ; mobile money : Wave, Orange Money, MTN MoMo (selon pays).",
      "Email transactionnel : Resend, Mailgun ou SendGrid selon configuration.",
      "Assistance IA (optionnelle, désactivée par défaut sans clé) : fournisseur configuré par l'opérateur.",
    ],
  },
];

export default function TrustCenterPage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold">Trust center</h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-widest text-ink-faint">
        Dernière mise à jour : 5 juillet 2026
      </p>
      <p className="mt-5 text-ink-muted">
        La confiance ne se déclare pas, elle se vérifie. Cette page rassemble nos engagements
        concrets — chacun est adossé aux documents contractuels (
        <Link href="/legal/cgu" className="underline">CGU</Link>,{" "}
        <Link href="/legal/cgv" className="underline">CGV</Link>,{" "}
        <Link href="/legal/sla" className="underline">SLA</Link>,{" "}
        <Link href="/legal/dpa" className="underline">DPA</Link>) et à la page{" "}
        <Link href="/statut" className="underline">Statut</Link>.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <Card key={p.title}>
            <CardContent className="pt-5">
              <h2 className="font-display text-base font-semibold">{p.title}</h2>
              <ul className="mt-3 space-y-2">
                {p.items.map((item) => (
                  <li key={item.slice(0, 40)} className="flex gap-2 text-sm text-ink-muted">
                    <span aria-hidden className="mt-0.5 text-success">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </article>
  );
}
