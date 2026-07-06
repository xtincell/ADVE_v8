import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Accord de traitement des données (DPA)" };

export default function DpaPage() {
  return (
    <LegalDoc
      title="Accord de traitement des données (DPA)"
      updated="5 juillet 2026"
      intro="Cet accord encadre le traitement de données personnelles réalisé par UPgraders pour le compte de ses clients professionnels dans le cadre de La Fusée. Il complète les CGU/CGV et s'interprète conformément aux réglementations applicables (dont la loi sénégalaise sur les données personnelles et, le cas échéant, le RGPD pour les clients de l'Union européenne)."
      sections={[
        {
          title: "Rôles",
          body: [
            "Pour les données de compte et d'usage de la plateforme, UPgraders agit en responsable de traitement.",
            "Pour les données que le client déclare sur ses propres contacts (membres de communauté, personas nominatifs, contacts de missions), le client est responsable de traitement et UPgraders sous-traitant : UPgraders ne traite ces données que sur instruction du client, matérialisée par l'usage des fonctions de la plateforme.",
          ],
        },
        {
          title: "Catégories de données traitées",
          body: [""],
          list: [
            "Identification et contact : nom, email, téléphone/WhatsApp, pays ;",
            "Données de marque déclarées (contenus des piliers, briefs, livrables) ;",
            "Données de facturation et de paiement (références de transaction — jamais les numéros de carte, traités par les prestataires de paiement) ;",
            "Données d'usage strictement techniques (journaux applicatifs sans données personnelles superflues).",
          ],
        },
        {
          title: "Finalités et instructions",
          body: [
            "Les données sont traitées pour : fournir le service, calculer les scores, générer les rapports, opérer La Guilde, facturer, notifier, assurer le support et la sécurité. Aucun profilage publicitaire, aucune revente de données.",
          ],
        },
        {
          title: "Sous-traitants ultérieurs",
          body: [
            "UPgraders recourt à des sous-traitants techniques strictement nécessaires : hébergement de l'application et de la base de données [À COMPLÉTER : hébergeur retenu par l'opérateur], prestataires de paiement (Stripe, opérateurs mobile money), fournisseurs d'email transactionnel. La liste à jour est disponible au Trust center. Le client est informé de tout changement significatif.",
          ],
        },
        {
          title: "Sécurité",
          body: [
            "Mesures en place : chiffrement en transit (TLS), secrets de connecteurs chiffrés au repos (AES-256-GCM), authentification à deux facteurs obligatoire pour les administrateurs, journal d'audit des opérations sensibles, cloisonnement des données par opérateur, sauvegardes quotidiennes.",
          ],
        },
        {
          title: "Durées de conservation",
          body: [""],
          list: [
            "Compte actif : durée de la relation contractuelle ;",
            "Compte fermé : suppression ou anonymisation sous 90 jours, hors obligations légales de conservation (facturation : 10 ans) ;",
            "Sessions de diagnostic non activées : purge possible après 12 mois d'inactivité ;",
            "Journaux techniques : 12 mois maximum.",
          ],
        },
        {
          title: "Droits des personnes",
          body: [
            "Chaque utilisateur peut exercer ses droits d'accès, de rectification, d'effacement et de portabilité depuis ses réglages (export et suppression de compte) ou par demande écrite. UPgraders assiste le client responsable de traitement dans la réponse aux demandes portant sur les données que celui-ci a déclarées.",
          ],
        },
        {
          title: "Violation de données",
          body: [
            "En cas de violation de données personnelles, UPgraders notifie le client sans retard injustifié après en avoir pris connaissance, avec les informations disponibles sur la nature, le périmètre et les mesures prises.",
          ],
        },
        {
          title: "Localisation et transferts",
          body: [
            "Les données sont hébergées sur l'infrastructure choisie par l'opérateur [À COMPLÉTER : localisation effective de l'hébergement]. Tout transfert international s'appuie sur des garanties appropriées (clauses contractuelles types ou équivalent local).",
          ],
        },
        {
          title: "Fin de contrat",
          body: [
            "À la fin du contrat, le client peut exporter ses données. UPgraders supprime ensuite les données du client dans les délais de l'article 6, sauf obligation légale contraire.",
          ],
        },
      ]}
    />
  );
}
