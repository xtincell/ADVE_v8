import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <LegalDoc
      title="Politique de confidentialité"
      updated="5 juillet 2026"
      intro="Cette politique explique, simplement, quelles données nous collectons, pourquoi, et ce que vous pouvez en faire. Principe directeur : nous ne collectons que ce qui sert le produit, nous n'inventons rien, nous ne revendons rien."
      sections={[
        {
          title: "Ce que nous collectons",
          body: [""],
          list: [
            "Ce que vous saisissez : réponses de diagnostic, contenus de piliers, briefs de mission, profils talent/agence, messages au support ;",
            "Votre compte : nom, email, téléphone éventuel, pays, mot de passe (haché, jamais lisible) ;",
            "Vos paiements : montants, statuts et références de transaction — jamais vos numéros de carte (traités par Stripe) ni vos codes mobile money ;",
            "Le strict minimum technique : journaux d'erreurs et d'audit des actions sensibles.",
          ],
        },
        {
          title: "Ce que nous n'en faisons pas",
          body: [
            "Pas de revente de données. Pas de publicité ciblée. Pas de cookies traceurs tiers. Pas d'entraînement de modèles d'IA sur vos données : lorsque des fonctions d'assistance sont activées par vos soins, vos contenus transitent ponctuellement vers le fournisseur configuré pour produire la réponse demandée, sont badgés « à valider », et chaque appel est journalisé (fournisseur, finalité, volumes).",
          ],
        },
        {
          title: "Pourquoi nous les traitons",
          body: [""],
          list: [
            "Exécuter le service (contrat) : score, rapports, missions, notifications ;",
            "Facturer et tenir la comptabilité (obligation légale) ;",
            "Sécuriser la plateforme (intérêt légitime) : audit, anti-abus ;",
            "Vous écrire à propos de votre compte (contrat) — le digest hebdomadaire est désactivable.",
          ],
        },
        {
          title: "Combien de temps",
          body: [
            "Tant que votre compte est actif. Après fermeture : suppression ou anonymisation sous 90 jours, hors factures (conservation légale). Les diagnostics jamais activés peuvent être purgés après 12 mois.",
          ],
        },
        {
          title: "Vos droits",
          body: [
            "Depuis vos réglages : exporter vos données (format lisible par machine) et supprimer votre compte. Par écrit : accès, rectification, opposition, portabilité, réclamation auprès de l'autorité de contrôle compétente.",
          ],
        },
        {
          title: "Sécurité",
          body: [
            "TLS partout, mots de passe hachés (bcrypt), secrets de connecteurs chiffrés (AES-256-GCM), double authentification obligatoire pour les administrateurs, cloisonnement par opérateur, journal d'audit, sauvegardes quotidiennes.",
          ],
        },
        {
          title: "Contact",
          body: [
            "Pour toute question sur vos données : page Contact, mention « données personnelles ». Nous répondons sous 10 jours ouvrés.",
          ],
        },
      ]}
    />
  );
}
