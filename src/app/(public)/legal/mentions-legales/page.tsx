import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsPage() {
  return (
    <LegalDoc
      title="Mentions légales"
      updated="5 juillet 2026"
      sections={[
        {
          title: "Éditeur",
          body: [
            "La plateforme La Fusée est éditée par UPgraders [À COMPLÉTER : forme sociale, capital, numéro d'immatriculation RCCM/RCS, adresse du siège].",
            "Directeur de la publication : [À COMPLÉTER : nom du représentant légal].",
            "Contact : voir la page Contact (email et WhatsApp officiels).",
          ],
        },
        {
          title: "Hébergement",
          body: [
            "L'application et les données sont hébergées par [À COMPLÉTER : hébergeur retenu par l'opérateur, adresse]. L'application est conçue pour être portable : l'hébergeur peut évoluer, cette page est tenue à jour en conséquence.",
          ],
        },
        {
          title: "Propriété intellectuelle",
          body: [
            "« La Fusée », « UPgraders », la méthode ADVE/RTIS, les interfaces, textes, graphismes et logiciels de la plateforme sont protégés. Toute reproduction non autorisée est interdite.",
          ],
        },
        {
          title: "Données personnelles",
          body: [
            "Le traitement des données personnelles est décrit dans la Politique de confidentialité et, pour les clients professionnels, dans le DPA. Vous disposez de droits d'accès, de rectification et de suppression exerçables depuis vos réglages ou par écrit.",
          ],
        },
        {
          title: "Cookies",
          body: [
            "La plateforme utilise uniquement des cookies strictement nécessaires : session authentifiée et préférence de thème. Aucun cookie publicitaire ou de traçage tiers n'est déposé.",
          ],
        },
      ]}
    />
  );
}
