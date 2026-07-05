// Contenu canon des deux marques de démonstration (cahier §11.4).
// _reference/ absent du repo : contenu rédigé depuis le cahier des charges
// (vision §1, identité §10) — à remplacer par le dump v1 si l'opérateur le fournit.

import type { PillarKind } from "@prisma/client";

type CanonPillars = Partial<Record<PillarKind, Record<string, string | string[]>>>;

export interface CanonBrand {
  slug: string;
  name: string;
  sector: string;
  country: string;
  city: string;
  pillars: CanonPillars;
}

export const UPGRADERS_CANON: CanonBrand = {
  slug: "upgraders",
  name: "UPgraders",
  sector: "Conseil & industries créatives",
  country: "SN",
  city: "Dakar",
  pillars: {
    AUTHENTICITE: {
      histoire:
        "UPgraders naît à Dakar d'un constat : l'industrie créative d'Afrique francophone déborde de marques à fort potentiel culturel mais sous-équipées en stratégie. Les fondateurs, passés par la communication et la tech, décident de construire l'agence qu'ils auraient voulu trouver : un fixer de marques qui industrialise ce que les grands réseaux réservent aux multinationales, au prix et au rythme du marché local.",
      archetype: "Le Magicien — celui qui transforme : de la poussière à l'étoile.",
      noyau_identitaire:
        "Transformer des marques en icônes culturelles. UPgraders ne « fait pas de la com » : l'agence installe des méthodes, des preuves et des rituels qui font basculer la perception d'un secteur entier. Ce qui ne changera jamais : le parti pris pour les marques africaines ambitieuses, la méthode avant l'esbroufe, la croissance partagée avec le client.",
      valeurs: ["Ambition culturelle", "Méthode avant esbroufe", "Croissance partagée (capture-then-grow)", "Honnêteté des données", "Excellence accessible"],
      mission:
        "Donner aux marques créatives d'Afrique francophone les moyens stratégiques de devenir des références culturelles — sans attendre d'avoir le budget d'une multinationale.",
    },
    DISTINCTION: {
      positionnement:
        "L'agence-fixer de l'industrie créative francophone : entre le consultant hors de prix et le freelance débordé, UPgraders opère un OS de marque (La Fusée) adossé à un réseau de talents (La Guilde), pour des marques à fort potentiel et pouvoir d'achat en construction.",
      promesse_maitre: "Votre marque devient une référence culturelle de son secteur — et ça se mesure.",
      personas:
        "Fondateurs et CMO de marques créatives (mode, food, musique, média, beauté, événementiel) en UEMOA/CEMAC et diaspora : 25-45 ans, ambitieux, mobile-first, sensibles à la preuve et au concret, budget 100k à 5M FCFA/an pour la marque.",
      territoire_creatif:
        "Le décollage : imagerie spatiale appliquée au réel africain, noir et blanc cassé (panda), corail et or, typographies affirmées, données mises en scène. Ni folklore, ni mimétisme parisien : une modernité propre.",
      differenciation: [
        "Une méthode propriétaire scorée (ADVE/RTIS) au lieu d'audits jetables",
        "Un produit logiciel (La Fusée) qui reste chez le client",
        "Un réseau de talents opéré et contrôlé qualité (La Guilde)",
        "Des prix localisés par zone économique, en FCFA d'abord",
      ],
    },
    VALEUR: {
      catalogue:
        "Diagnostic de marque scoré (gratuit) ; rapport stratégique Oracle 35 sections (one-shot) ; cockpit de pilotage continu (abonnement mensuel) ; retainers d'accompagnement (base, pro, enterprise sur devis) ; missions créatives opérées via La Guilde (identité, contenu, campagnes, événements).",
      business_model:
        "SaaS + services : abonnements récurrents (cockpit, retainers) pour la prévisibilité, one-shots (rapports) pour l'acquisition, commissions sur les missions Guilde (taux dégressifs selon le tier du talent) pour l'écosystème. Encaissements mobile money et carte, facturation FCFA d'abord.",
      preuves:
        "La méthode est née de l'opération réelle de marques accompagnées à Dakar et Abidjan ; chaque diagnostic produit un score public reproductible ; les deux marques canon (UPgraders, La Fusée) sont pilotées dans l'outil lui-même — l'agence mange sa propre cuisine.",
      politique_prix:
        "Capture-then-grow : entrer bas (diagnostic gratuit, PDF accessible), grandir avec le client (cockpit puis retainer). Grille localisée par zone (UEMOA, CEMAC, diaspora), jamais de prix cachés, enterprise sur devis.",
    },
    ENGAGEMENT: {
      canaux: ["Site & funnel La Fusée", "WhatsApp Business", "Instagram", "LinkedIn", "Événements sectoriels Dakar/Abidjan"],
      rituels:
        "Diagnostic public gratuit comme rite d'entrée ; revue mensuelle de score avec chaque client cockpit ; publication régulière de cas et de preuves ; présence systématique aux rendez-vous de l'industrie créative locale.",
      communaute:
        "Le réseau La Guilde (talents et agences partenaires) + le portefeuille de marques clientes forment la communauté active ; animation par les missions, la progression de tiers talents et les revues de score.",
      parcours_engagement:
        "Découverte (contenu, bouche-à-oreille) → diagnostic gratuit scoré → rapport payant → cockpit mensuel → retainer d'accompagnement → ambassadeur (témoignage, referral). Chaque étape a son artefact et son prix.",
    },
  },
};

export const LAFUSEE_CANON: CanonBrand = {
  slug: "la-fusee",
  name: "La Fusée",
  sector: "SaaS — stratégie de marque",
  country: "SN",
  city: "Dakar",
  pillars: {
    AUTHENTICITE: {
      histoire:
        "La Fusée est née dans les ateliers d'UPgraders : après des dizaines de diagnostics menés à la main, l'équipe a versé sa méthode dans un produit. D'abord outil interne, puis produit vendu, La Fusée est l'OS que les clients utilisent pour piloter leur marque — le savoir-faire de l'agence, industrialisé.",
      archetype: "Le Sage-outilleur : la connaissance qui rend capable, pas dépendant.",
      noyau_identitaire:
        "Un OS de marque honnête : tout score est déterministe et reproductible, toute donnée manquante est affichée comme manquante, toute recommandation remonte à ce que la marque a déclaré. La Fusée ne fabrique jamais de certitude — elle organise la vérité d'une marque et la fait progresser.",
      valeurs: ["Honnêteté des données", "Méthode reproductible", "Souveraineté du client", "Mobile-first Afrique", "Sobriété technique"],
      mission:
        "Mettre un directeur de la stratégie de marque dans la poche de chaque fondateur créatif d'Afrique francophone, au prix d'un abonnement téléphonique.",
    },
    DISTINCTION: {
      positionnement:
        "Le premier Industry OS de stratégie de marque pensé pour l'Afrique francophone : là où les outils occidentaux commencent par la carte bancaire et l'anglais, La Fusée commence par le FCFA, le mobile money et le français.",
      promesse_maitre: "Votre marque, scorée, pilotée et propulsée — de la poussière à l'étoile.",
      personas:
        "Le fondateur-CMO d'une marque créative qui pilote tout depuis son téléphone entre deux rendez-vous : il veut savoir où il en est (score), quoi faire ensuite (plan), et qui peut le faire (talents) — sans jargon, sans consultant à 2M FCFA.",
      territoire_creatif:
        "Le cockpit spatial domestiqué : instruments lisibles, chiffres en JetBrains Mono, corail énergique sur noir/os, micro-animations de décollage. La donnée comme matière visuelle.",
      differenciation: [
        "Score de marque /200 déterministe et historisé — pas d'opinion, une mesure",
        "Méthode complète ADVE→RTIS→Oracle dans un seul outil",
        "Fonctionne sans IA configurée : le déterministe d'abord, l'IA en option",
        "Paiement mobile money et validation WhatsApp intégrés au produit",
      ],
    },
    VALEUR: {
      catalogue:
        "Intake gratuit scoré ; rapport PDF léger (one-shot) ; Oracle 35 sections (one-shot) ; Cockpit mensuel (pilotage continu : ADVE, RTIS, livrables, opérations) ; accès Intelligence (superfans, radar sectoriel) ; API MCP facturée à l'appel pour les intégrations.",
      business_model:
        "Abonnement SaaS mensuel localisé par zone + one-shots d'acquisition + API MCP à l'usage. Le produit alimente l'agence (missions Guilde) et l'agence alimente le produit (méthode, seeds, preuves).",
      preuves:
        "Chaque écran du produit tourne sur ses propres données de démonstration reproductibles ; le scoring est couvert par des tests unitaires publics dans le code ; les marques canon UPgraders et La Fusée sont maintenues dans l'outil.",
      politique_prix:
        "FCFA d'abord, grille par zone économique (UEMOA/CEMAC/diaspora), gratuit à l'entrée (intake), premium au mois sans engagement — le prix d'un forfait téléphonique, pas d'une mission de conseil.",
    },
    ENGAGEMENT: {
      canaux: ["Funnel web mobile-first", "WhatsApp (paiement manuel & support)", "Instagram", "La Guilde (missions publiques)"],
      rituels:
        "Le refresh RTIS après chaque amendement ; le snapshot de score qui historise chaque progression ; le digest hebdomadaire des notifications ; la revue mensuelle de palier.",
      communaute:
        "Les founders clients, les talents de La Guilde et les agences partenaires interagissent autour des missions et des marques ; la Devotion Ladder du produit s'applique à sa propre base d'utilisateurs.",
      parcours_engagement:
        "Visiteur → intake token (sans compte) → résultat scoré → compte activé → cockpit → abonné → utilisateur MCP/retainer. Chaque franchissement est mesuré et notifié.",
    },
  },
};

export const DEMO_BRAND: CanonBrand & { inferredKeys: string[] } = {
  slug: "nyama-cafe",
  name: "Nyama Café",
  sector: "Food & boissons",
  country: "SN",
  city: "Dakar",
  // Marque démo volontairement incomplète (parcours réaliste) : mix DECLARED/INFERRED,
  // plusieurs champs vides — le cockpit montre un vrai « en cours ».
  pillars: {
    AUTHENTICITE: {
      histoire:
        "Nyama Café torréfie à Dakar des cafés d'Afrique de l'Ouest et de l'Est. Fondé par une ancienne logisticienne retournée au pays, le projet est né d'un ras-le-bol : voir le continent exporter son café vert et racheter du soluble importé.",
      valeurs: ["Fierté du produit local", "Qualité artisanale", "Commerce direct producteur"],
    },
    DISTINCTION: {
      positionnement:
        "Le café de spécialité 100 % africain, torréfié sur place, pour les urbains de Dakar qui veulent boire local sans sacrifier l'exigence.",
      promesse_maitre: "Le meilleur café que tu aies bu, et il vient d'ici.",
    },
    VALEUR: {
      catalogue:
        "Cafés en grains et moulus (3 origines), abonnement mensuel particuliers, offre B2B bureaux et restaurants, corner dégustation au marché Kermel.",
    },
    ENGAGEMENT: {
      canaux: ["Instagram", "WhatsApp", "Corner Kermel"],
      communaute:
        "Environ 400 clients réguliers dont une cinquantaine d'abonnés mensuels ; un groupe WhatsApp de passionnés animé chaque semaine.",
    },
  },
  // Champs pré-remplis « par l'IA » pour la démo du badge à valider (inférables uniquement).
  inferredKeys: ["AUTHENTICITE.mission", "DISTINCTION.territoire_creatif", "VALEUR.preuves"],
};

export const DEMO_INFERRED: CanonPillars = {
  AUTHENTICITE: {
    mission: "Rendre aux villes africaines la fierté de leur café, de la cerise à la tasse.",
  },
  DISTINCTION: {
    territoire_creatif: "Artisanat urbain : kraft, vert profond, photographie brute de torréfaction, typographie manuelle.",
  },
  VALEUR: {
    preuves: "Sélection par deux torréfacteurs primés ; partenariats directs avec trois coopératives ; note moyenne 4,8/5 sur 200 avis clients.",
  },
};
