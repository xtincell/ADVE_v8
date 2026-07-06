import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Conditions générales d'utilisation" };

export default function CguPage() {
  return (
    <LegalDoc
      title="Conditions générales d'utilisation"
      updated="5 juillet 2026"
      intro="Les présentes conditions régissent l'utilisation de la plateforme La Fusée, éditée par UPgraders, par tout visiteur ou titulaire de compte. En utilisant le service, vous les acceptez sans réserve."
      sections={[
        {
          title: "Objet du service",
          body: [
            "La Fusée est une plateforme logicielle de stratégie de marque : diagnostic scoré, référentiel de marque (piliers ADVE/RTIS), génération de rapports et de livrables, place de marché de missions créatives (La Guilde) et outils de pilotage associés.",
            "Le score de marque est un indicateur calculé de manière déterministe à partir des données déclarées par l'utilisateur. Il constitue une aide à la décision et non un conseil individualisé, une garantie de résultat commercial ou une évaluation financière.",
          ],
        },
        {
          title: "Comptes et accès",
          body: [
            "La création d'un compte requiert une adresse email valide. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.",
            "Certains rôles (opérateur, administrateur) sont réservés à l'équipe UPgraders et à ses partenaires habilités. L'accès administrateur est protégé par une authentification à deux facteurs.",
          ],
        },
        {
          title: "Diagnostic sans compte",
          body: [
            "Le diagnostic public est accessible via un lien à jeton unique, sans création de compte. Ce lien donne accès aux réponses et au résultat associés : ne le partagez qu'avec des personnes de confiance. Les sessions de diagnostic non activées peuvent être purgées après une période d'inactivité.",
          ],
        },
        {
          title: "Données déclarées et exactitude",
          body: [
            "La qualité des analyses dépend des données que vous déclarez. La plateforme n'invente jamais de données : les champs non renseignés sont affichés comme tels et les contenus pré-remplis par assistance automatique sont clairement badgés « à valider » jusqu'à votre validation expresse.",
          ],
        },
        {
          title: "Propriété intellectuelle",
          body: [
            "Vous restez propriétaire des contenus que vous déclarez (textes, données de marque, briefs). Vous concédez à UPgraders une licence limitée pour héberger, traiter et afficher ces contenus aux seules fins d'exécution du service.",
            "La plateforme, sa méthode, ses interfaces, sa marque et ses éléments visuels demeurent la propriété exclusive d'UPgraders. Les rapports générés vous sont livrés pour votre usage interne et votre communication d'entreprise ; leur revente en tant que prestation tierce est interdite sans accord écrit.",
          ],
        },
        {
          title: "La Guilde — règles spécifiques",
          body: [
            "Le dépôt d'une mission est soumis à modération avant toute publication. Les coordonnées de contact des déposants ne sont jamais affichées publiquement.",
            "Les candidatures et devis échangés via la plateforme engagent leurs auteurs. UPgraders arbitre les litiges déclarés entre parties de bonne foi, sans se substituer aux juridictions compétentes.",
          ],
        },
        {
          title: "Usages interdits",
          body: ["Sont notamment interdits :"],
          list: [
            "l'usurpation d'identité ou de marque, la déclaration de données manifestement mensongères ;",
            "toute tentative d'accès non autorisé, d'extraction massive ou de perturbation du service ;",
            "l'utilisation de la plateforme pour des contenus illicites, diffamatoires ou contraires à l'ordre public ;",
            "la revente ou la sous-licence du service sans accord écrit d'UPgraders.",
          ],
        },
        {
          title: "Disponibilité",
          body: [
            "Le service est fourni « en l'état », avec un objectif de disponibilité décrit dans le SLA. Des interruptions de maintenance peuvent survenir ; les opérations planifiées sont annoncées sur la page Statut.",
          ],
        },
        {
          title: "Responsabilité",
          body: [
            "Dans les limites permises par la loi, la responsabilité totale d'UPgraders au titre du service est plafonnée aux sommes effectivement payées par vous au cours des douze derniers mois. UPgraders ne répond pas des préjudices indirects (perte de chiffre d'affaires, d'image ou d'opportunité).",
          ],
        },
        {
          title: "Résiliation",
          body: [
            "Vous pouvez fermer votre compte à tout moment depuis vos réglages ou sur demande écrite. UPgraders peut suspendre ou résilier un compte en cas de violation des présentes, après notification sauf urgence caractérisée.",
          ],
        },
        {
          title: "Droit applicable",
          body: [
            "Les présentes sont régies par le droit applicable au siège d'UPgraders [À COMPLÉTER : droit sénégalais / autre selon l'immatriculation]. Tout litige sera porté devant les juridictions compétentes du siège, après tentative de résolution amiable de trente jours.",
          ],
        },
      ]}
    />
  );
}
