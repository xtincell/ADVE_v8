import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Engagement de niveau de service (SLA)" };

export default function SlaPage() {
  return (
    <LegalDoc
      title="Engagement de niveau de service (SLA)"
      updated="5 juillet 2026"
      intro="Cet engagement s'applique aux clients titulaires d'un abonnement payant (Cockpit, retainers, Enterprise). Il décrit ce que nous garantissons — et ce que nous faisons quand nous ne le tenons pas."
      sections={[
        {
          title: "Disponibilité cible",
          body: [
            "Objectif de disponibilité mensuelle de la plateforme : 99,5 % (Cockpit et retainers) — hors maintenances planifiées annoncées au moins 24 heures à l'avance sur la page Statut.",
            "La disponibilité se mesure sur la capacité à se connecter et à accéder aux fonctions cœur : lecture/édition des piliers, consultation des rapports générés, accès à La Guilde.",
          ],
        },
        {
          title: "Fenêtres de maintenance",
          body: [
            "Les maintenances planifiées ont lieu de préférence entre 23h et 5h (heure de Dakar, GMT). Les migrations de données majeures sont annoncées 72 heures à l'avance.",
          ],
        },
        {
          title: "Support",
          body: ["Canaux et délais de première réponse en jours ouvrés (lundi–vendredi, 9h–18h GMT) :"],
          list: [
            "Cockpit : espace client et email — première réponse sous 2 jours ouvrés ;",
            "Retainer Base/Pro : canal WhatsApp dédié — première réponse sous 1 jour ouvré ;",
            "Enterprise : engagements spécifiques au contrat, jusqu'au support prioritaire sous 4 heures ouvrées.",
          ],
        },
        {
          title: "Incidents",
          body: [
            "Un incident majeur (indisponibilité générale, perte de fonction cœur) déclenche : accusé de réception sous 2 heures ouvrées, communication de suivi au moins toutes les 4 heures ouvrées, post-mortem publié sous 5 jours ouvrés pour les incidents de plus d'une heure.",
          ],
        },
        {
          title: "Sauvegardes et données",
          body: [
            "Les données sont sauvegardées quotidiennement avec une rétention minimale de 14 jours. Objectif de point de reprise (RPO) : 24 heures. Objectif de délai de reprise (RTO) : 12 heures ouvrées.",
          ],
        },
        {
          title: "Compensation",
          body: [
            "Si la disponibilité mensuelle constatée est inférieure à l'objectif, le client abonné peut demander un avoir : 10 % de la mensualité en dessous de 99,5 %, 25 % en dessous de 99 %, 50 % en dessous de 97 %. La demande s'effectue dans les 30 jours suivant le mois concerné ; l'avoir s'impute sur les échéances futures.",
          ],
        },
        {
          title: "Exclusions",
          body: ["Ne sont pas comptabilisés comme indisponibilité :"],
          list: [
            "les pannes imputables aux fournisseurs d'accès, aux opérateurs mobile money ou aux services tiers du client ;",
            "les maintenances planifiées annoncées ;",
            "les suspensions pour violation des CGU ou défaut de paiement ;",
            "les cas de force majeure.",
          ],
        },
      ]}
    />
  );
}
