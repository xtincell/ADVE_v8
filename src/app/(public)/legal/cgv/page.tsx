import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function CgvPage() {
  return (
    <LegalDoc
      title="Conditions générales de vente"
      updated="5 juillet 2026"
      intro="Les présentes conditions s'appliquent à toute commande passée sur La Fusée auprès d'UPgraders : achats one-shot (rapports), abonnements (Cockpit, retainers), missions opérées via La Guilde et usage facturé de l'API."
      sections={[
        {
          title: "Offres et prix",
          body: [
            "Les prix sont affichés en FCFA (XOF/XAF) pour les zones UEMOA et CEMAC et en euros pour la diaspora, selon la grille tarifaire en vigueur au moment de la commande. La parité appliquée est la parité fixe de 655,957 FCFA pour 1 euro.",
            "Les prix « sur devis » (offre Enterprise, missions spécifiques) font l'objet d'une proposition écrite dont la validité est de trente jours.",
          ],
        },
        {
          title: "Commande et paiement",
          body: [
            "Le paiement s'effectue par carte bancaire (Stripe), mobile money (Wave, Orange Money, MTN MoMo, selon disponibilité par pays) ou par règlement manuel confirmé via WhatsApp.",
            "Dans le cas du règlement manuel : la commande reste en statut « en attente de validation » et n'ouvre aucun droit tant qu'un opérateur UPgraders n'a pas confirmé la réception effective des fonds. L'accès est alors ouvert pour la période payée (trente jours pour un abonnement mensuel).",
          ],
        },
        {
          title: "Livraison des produits numériques",
          body: [
            "Les rapports (PDF du diagnostic, Oracle) sont générés à partir des données de votre marque au moment de la commande et livrés dans votre espace. Chaque export est horodaté et scellé par une empreinte numérique.",
            "Les rapports sont réputés livrés dès leur mise à disposition dans votre espace, indépendamment de leur téléchargement effectif.",
          ],
        },
        {
          title: "Abonnements et reconduction",
          body: [
            "Les abonnements sont mensuels et reconduits tacitement. Vous pouvez résilier à tout moment ; la résiliation prend effet à la fin de la période en cours, sans remboursement prorata sauf disposition légale contraire.",
            "Le non-paiement d'une échéance entraîne la suspension des fonctions premium après notification, puis l'expiration de l'abonnement.",
          ],
        },
        {
          title: "Droit de rétractation",
          body: [
            "Pour les contenus numériques livrés immédiatement (rapports générés à la demande), vous reconnaissez expressément que l'exécution commence dès la commande et renoncez à votre droit de rétractation dans la mesure permise par la loi applicable. Pour les abonnements, la résiliation reste possible à tout moment pour l'échéance suivante.",
          ],
        },
        {
          title: "Missions La Guilde",
          body: [
            "Pour les missions opérées via La Guilde, UPgraders agit comme intermédiaire opérateur : cadrage du brief, modération, sélection assistée, suivi. Le contrat d'exécution se forme entre la marque cliente et le talent retenu, aux conditions du devis accepté.",
            "Une commission de service, dégressive selon le niveau du talent, est prélevée sur le montant de la mission. Les taux en vigueur sont disponibles dans l'espace Creator et rappelés sur chaque relevé.",
            "En cas de litige, UPgraders propose un arbitrage amiable documenté. Les fonds éventuellement séquestrés le sont à titre conservatoire jusqu'à résolution.",
          ],
        },
        {
          title: "API et usage facturé",
          body: [
            "L'accès API (MCP) est facturé à l'appel selon le tarif en vigueur. Les relevés mensuels sont gelés à date et exigibles à réception. Les clés API sont personnelles ; leur partage engage le titulaire.",
          ],
        },
        {
          title: "Facturation",
          body: [
            "Une facture est émise pour chaque paiement confirmé et reste accessible dans votre espace. Les taxes applicables [À COMPLÉTER : régime TVA de l'opérateur] s'ajoutent aux prix affichés lorsque la loi l'exige.",
          ],
        },
        {
          title: "Remboursements",
          body: [
            "Au-delà des cas légaux, tout remboursement relève d'un geste commercial apprécié au cas par cas. Les paiements mobile money confirmés et les rapports déjà générés ne sont pas remboursables.",
          ],
        },
        {
          title: "Réclamations",
          body: [
            "Toute réclamation s'adresse à l'opérateur via la page Contact ou votre espace client, dans les trente jours de l'événement. UPgraders répond sous dix jours ouvrés.",
          ],
        },
      ]}
    />
  );
}
