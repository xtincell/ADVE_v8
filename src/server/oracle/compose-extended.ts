import { callout, empty, kv, list, p, score, table, type SectionContent } from "./blocks";
import { cultIndex, superfanCount, type Devotion } from "@/server/intelligence/measures";
import {
  devotionDistribution,
  has,
  items,
  superfans,
  text,
  type OracleContext,
} from "./context";

// Sections 22–35 : composition déterministe honnête (fallback), enrichissement
// LLM optionnel par-dessus quand une clé est configurée (cahier §5.1).

const INSUFFISANT = "INSUFFISANT";
const DEVOTION_LABELS: Record<string, string> = {
  SPECTATEUR: "Spectateur",
  INTERESSE: "Intéressé",
  PARTICIPANT: "Participant",
  ENGAGE: "Engagé",
  AMBASSADEUR: "Ambassadeur",
  EVANGELISTE: "Évangéliste",
};

export function s22_crew(ctx: OracleContext): SectionContent {
  const sf = superfans(ctx);
  const blocks = [
    p(
      "Le programme Crew transforme vos superfans en équipe d'amplification : un rôle, un rituel, une reconnaissance — pour chacun.",
    ),
  ];
  if (sf.length > 0) {
    blocks.push(
      p(`Noyau de départ réel : ${sf.length} personne${sf.length > 1 ? "s" : ""} déjà au niveau requis.`),
      table(
        ["Membre", "Rôle candidat (à confirmer avec la personne)"],
        sf.map((m) => [m.name, m.level === "EVANGELISTE" ? "Capitaine — anime et recrute" : "Éclaireur — relaie et fait entrer"]),
      ),
      list([
        "Formaliser l'invitation : un message personnel, pas une annonce publique.",
        "Donner un avantage réel (accès anticipé, coulisses, produit) — pas un badge creux.",
        "Créer le rituel du Crew : un rendez-vous récurrent réservé.",
      ], true),
    );
  } else {
    blocks.push(
      empty(INSUFFISANT, "Aucun superfan recensé : le programme Crew se construit sur des personnes réelles. Recensez d'abord votre communauté (Cockpit → Intelligence)."),
    );
  }
  return { blocks, sources: ["Communauté (réelle)"] };
}

export function s23_plan_comm(ctx: OracleContext): SectionContent {
  const canaux = items(ctx, "ENGAGEMENT", "canaux");
  const rituels = text(ctx, "ENGAGEMENT", "rituels");
  const blocks = [];
  if (canaux.length > 0) {
    blocks.push(
      p("Ossature de communication dérivée de vos canaux déclarés :"),
      table(
        ["Canal", "Cadence recommandée", "Format porteur"],
        canaux.map((c) => {
          const cl = c.toLowerCase();
          if (/instagram|tiktok/.test(cl)) return [c, "3–5 / semaine", "Formats courts : coulisses, preuve, produit"];
          if (/whatsapp/.test(cl)) return [c, "1–2 / semaine", "Message utile + rendez-vous du rituel"];
          if (/youtube/.test(cl)) return [c, "1–2 / mois", "Fond : récit, méthode, études de cas"];
          if (/site|web/.test(cl)) return [c, "1 / mois", "Preuve longue durée : cas, catalogue à jour"];
          if (/boutique|corner|marché|événement/.test(cl)) return [c, "Selon rituel", "Expérience : dégustation, démonstration"];
          return [c, "À cadrer", "À cadrer avec l'opérateur"];
        }),
      ),
    );
  } else {
    blocks.push(empty(INSUFFISANT, "Déclarez vos canaux (pilier Engagement) pour dériver le plan de communication."));
  }
  if (rituels) blocks.push(p(`Rituels existants à ancrer dans le calendrier : ${rituels}`));
  return { blocks, sources: ["Pilier E"] };
}

export function s24_7s(ctx: OracleContext): SectionContent {
  const rows: [string, string][] = [
    ["Strategy", text(ctx, "STRATEGIE", "plan_activation") ? "Plan d'activation dérivé (section 11)" : "INSUFFISANT — recalculer le pilier Stratégie"],
    ["Shared Values", items(ctx, "AUTHENTICITE", "valeurs").join(", ") || "INSUFFISANT — déclarer les valeurs"],
    ["Style", text(ctx, "AUTHENTICITE", "archetype") || "INSUFFISANT — déclarer l'archétype"],
    ["Skills", items(ctx, "DISTINCTION", "differenciation").join(", ") || "INSUFFISANT — déclarer les différenciateurs"],
    ["Systems", has(ctx, "ENGAGEMENT", "rituels") ? text(ctx, "ENGAGEMENT", "rituels") : "INSUFFISANT — déclarer les rituels/process d'engagement"],
    ["Structure", "À documenter avec l'opérateur (organisation interne non déclarée dans le socle)"],
    ["Staff", "À documenter avec l'opérateur (équipe non déclarée dans le socle)"],
  ];
  return {
    blocks: [
      p("Lecture de la marque par le cadre McKinsey 7S — chaque case n'affiche que le déclaré :"),
      kv(rows),
    ],
    sources: ["Piliers A/D/E/S"],
  };
}

export function s25_bcg(ctx: OracleContext): SectionContent {
  const blocks = [
    p(
      "La matrice BCG croise part de marché relative et croissance du marché. Ces deux mesures exigent des données de ventes par ligne et des données sectorielles chiffrées.",
    ),
  ];
  if (has(ctx, "VALEUR", "catalogue")) {
    blocks.push(
      p("Lignes d'offre déclarées (base de la future matrice) :"),
      list(text(ctx, "VALEUR", "catalogue").split(/[,;·]/).map((s) => s.trim()).filter(Boolean).slice(0, 8)),
      empty(
        INSUFFISANT,
        "Positionnement dans la matrice non calculable sans données de ventes par ligne et de croissance sectorielle. À instruire en revue avec l'opérateur — aucune case n'est remplie au jugé.",
      ),
    );
  } else {
    blocks.push(empty(INSUFFISANT, "Déclarez le catalogue (pilier Valeur) — c'est l'unité d'analyse de la matrice."));
  }
  return { blocks, sources: ["Pilier V"] };
}

export function s26_nps(ctx: OracleContext): SectionContent {
  const canaux = items(ctx, "ENGAGEMENT", "canaux");
  const blocks = [
    empty(INSUFFISANT, "Aucune mesure NPS collectée à ce jour — le score ne s'invente pas."),
    p("Protocole de collecte adapté à vos canaux déclarés :"),
  ];
  const proto: string[] = ["Question unique : « Recommanderiez-vous " + ctx.brand.name + " ? (0–10) » + « Pourquoi ? »"];
  if (canaux.some((c) => /whatsapp/i.test(c))) proto.push("Envoi WhatsApp aux clients des 90 derniers jours (meilleur taux de réponse local).");
  if (canaux.some((c) => /instagram|tiktok/i.test(c))) proto.push("Relais en story avec lien — mesure d'appoint, biais d'audience à garder en tête.");
  if (canaux.some((c) => /boutique|corner|marché/i.test(c))) proto.push("Carte QR en point de vente après achat.");
  proto.push("Seuil de lecture : ≥ 30 réponses avant d'interpréter ; recalcul trimestriel.");
  blocks.push(list(proto, true));
  return { blocks, sources: ["Pilier E", "Méthode"] };
}

export function s27_talent(ctx: OracleContext): SectionContent {
  const roles: string[] = [];
  for (const c of items(ctx, "ENGAGEMENT", "canaux")) {
    const cl = c.toLowerCase();
    if (/instagram|tiktok|youtube/.test(cl)) roles.push(`Créateur de contenu (${c})`);
    if (/whatsapp/.test(cl)) roles.push("Animateur de communauté");
    if (/boutique|corner|marché/.test(cl)) roles.push("Responsable expérience point de vente");
  }
  const blocks = [];
  if (roles.length > 0) {
    blocks.push(
      p("Compétences à développer ou à recruter, dérivées de vos canaux :"),
      list([...new Set(roles)]),
      p("Pour chaque compétence : d'abord identifier un talent de La Guilde (mission courte), ensuite décider internaliser/externaliser sur preuve."),
    );
  } else {
    blocks.push(empty(INSUFFISANT, "Déclarez vos canaux pour dériver les compétences à couvrir."));
  }
  return { blocks, sources: ["Pilier E", "La Guilde"] };
}

export function s28_horizons(ctx: OracleContext): SectionContent {
  const h1 = text(ctx, "VALEUR", "catalogue");
  const h2 = items(ctx, "INNOVATION", "actions_candidates");
  const h3 = items(ctx, "INNOVATION", "paris");
  return {
    blocks: [
      p("Lecture Three Horizons — chaque horizon n'est peuplé que par vos données :"),
      kv([
        ["Horizon 1 — défendre le cœur", h1 || "INSUFFISANT : catalogue non déclaré"],
        ["Horizon 2 — construire l'émergent", h2.length > 0 ? h2.slice(0, 4).join(" · ") : "INSUFFISANT : recalculer Innovation"],
        ["Horizon 3 — parier sur la rupture", h3.length > 0 ? h3.join(" · ") : "INSUFFISANT : recalculer Innovation"],
      ]),
      callout("Répartition d'effort classique 70/20/10 — à arbitrer en revue selon votre trésorerie réelle."),
    ],
    sources: ["Piliers V/I"],
  };
}

export function s29_palette(ctx: OracleContext): SectionContent {
  const blocks = [
    p(
      "La Strategy Palette (BCG) choisit une posture stratégique selon la prévisibilité et la malléabilité de l'environnement.",
    ),
  ];
  if (has(ctx, "DISTINCTION", "positionnement") || has(ctx, "VALEUR", "business_model")) {
    blocks.push(
      p(
        "Votre secteur créatif local combine faible prévisibilité (tendances rapides) et forte malléabilité (les acteurs façonnent les codes) : la posture de référence est « Shaping » — co-créer les standards du secteur plutôt que les subir.",
      ),
      list([
        "Concrètement : publier votre méthode/vos codes (territoire créatif) pour que d'autres s'y réfèrent.",
        "Fédérer : rituels ouverts, collaborations, programme Crew (section 22).",
        "Mesurer : votre part de voix dans les conversations du secteur (veille, pilier T).",
      ]),
      callout("Cette lecture est une heuristique de méthode, pas une donnée : à valider en revue opérateur.", "warning"),
    );
  } else {
    blocks.push(empty(INSUFFISANT, "Déclarez positionnement et business model pour instruire la posture."));
  }
  return { blocks, sources: ["Piliers D/V", "Méthode"] };
}

export function s30_budget_framework(ctx: OracleContext): SectionContent {
  const actions = items(ctx, "INNOVATION", "actions_candidates");
  const run = ["Production récurrente des canaux déclarés", "Animation de communauté & rituels", "Outillage (Cockpit, veille)"];
  const change = actions.slice(0, 5);
  return {
    blocks: [
      p("Cadre budgétaire Run / Change — sans montants inventés, à chiffrer en revue :"),
      table(
        ["Type", "Poste"],
        [
          ...run.map((r) => ["Run (récurrent)", r] as [string, string]),
          ...(change.length > 0
            ? change.map((c) => ["Change (projet)", c] as [string, string])
            : [["Change (projet)", "INSUFFISANT — recalculer Innovation"] as [string, string]]),
        ],
      ),
      p("Règle de méthode : sécuriser le Run avant d'engager le Change ; un projet Change qui réussit devient une ligne Run."),
    ],
    sources: ["Piliers E/I", "Méthode"],
  };
}

export function s31_cult_index(ctx: OracleContext): SectionContent {
  const dist = devotionDistribution(ctx) as Devotion;
  const cult = cultIndex(dist);
  const sf = superfanCount(dist);
  const blocks = [];
  if (cult) {
    blocks.push(
      score("Cult Index (profondeur de dévotion moyenne)", cult.value, 100),
      p(`Calculé sur ${cult.sample} membre${cult.sample > 1 ? "s" : ""} recensé${cult.sample > 1 ? "s" : ""}, dont ${sf} superfan${sf > 1 ? "s" : ""}. Formule fixe : moyenne pondérée des échelons (Spectateur 0 → Évangéliste 100).`),
      callout(cult.sample < 20 ? "Échantillon inférieur à 20 membres : l'index est indicatif — poursuivez le recensement." : "Index historisé à chaque snapshot — la trajectoire compte plus que le niveau.", cult.sample < 20 ? "warning" : "info"),
    );
  } else {
    blocks.push(empty(INSUFFISANT, "Aucun membre de communauté recensé — le Cult Index n'est jamais fabriqué. Recensez dans Cockpit → Intelligence."));
  }
  return { blocks, sources: ["Communauté (réelle)"] };
}

export function s32_engagement_matrix(ctx: OracleContext): SectionContent {
  const rituels = text(ctx, "ENGAGEMENT", "rituels");
  const canaux = items(ctx, "ENGAGEMENT", "canaux");
  const modes: Record<string, string[]> = { Spectacle: [], Participation: [], "Co-création": [], Appartenance: [] };
  for (const c of canaux) {
    const cl = c.toLowerCase();
    if (/youtube|radio|tv|tiktok/.test(cl)) modes.Spectacle!.push(c);
    else if (/instagram|facebook|x |twitter/.test(cl)) modes.Participation!.push(c);
    else if (/whatsapp/.test(cl)) modes.Appartenance!.push(c);
    else if (/boutique|corner|marché|événement|atelier/.test(cl)) modes["Co-création"]!.push(c);
  }
  if (/atelier|concours|défi|co-?création/i.test(rituels)) modes["Co-création"]!.push("Rituels déclarés");
  if (/groupe|club|membre|abonn/i.test(rituels)) modes.Appartenance!.push("Rituels déclarés");
  const anyMapped = Object.values(modes).some((v) => v.length > 0);
  return {
    blocks: anyMapped
      ? [
          p("Vos dispositifs déclarés, classés par mode d'engagement :"),
          table(
            ["Mode", "Dispositifs déclarés", "Lecture"],
            (Object.entries(modes) as [string, string[]][]).map(([mode, items_]) => [
              mode,
              items_.length > 0 ? items_.join(", ") : "—",
              items_.length === 0 ? "Mode non couvert — angle mort potentiel" : "Couvert",
            ]),
          ),
          p("La bascule superfan se joue dans les modes Co-création et Appartenance : c'est là qu'un public devient une communauté."),
        ]
      : [empty(INSUFFISANT, "Déclarez canaux et rituels (pilier Engagement) pour instruire la matrice.")],
    sources: ["Pilier E"],
  };
}

export function s33_devotion(ctx: OracleContext): SectionContent {
  const dist = devotionDistribution(ctx);
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return {
      blocks: [
        empty(INSUFFISANT, "Aucun membre recensé — la Devotion Ladder s'appuie exclusivement sur votre recensement réel (Cockpit → Intelligence)."),
        p("Les 6 échelons de la méthode : Spectateur → Intéressé → Participant → Engagé → Ambassadeur → Évangéliste. Les deux derniers sont vos superfans."),
      ],
      sources: ["Méthode"],
    };
  }
  return {
    blocks: [
      table(
        ["Échelon", "Membres", "Part"],
        Object.entries(dist).map(([lvl, n]) => [DEVOTION_LABELS[lvl] ?? lvl, String(n), total > 0 ? `${Math.round((n / total) * 100)} %` : "0 %"]),
      ),
      p(
        `Lecture : ${((dist.AMBASSADEUR ?? 0) + (dist.EVANGELISTE ?? 0))} superfan(s) sur ${total} recensés. L'objectif de la méthode n'est pas d'élargir la base — c'est de faire monter chaque personne d'un échelon.`,
      ),
    ],
    sources: ["Communauté (réelle)"],
  };
}

export function s34_position_culturelle(ctx: OracleContext): SectionContent {
  const blocks = [];
  const positionnement = text(ctx, "DISTINCTION", "positionnement");
  const noyau = text(ctx, "AUTHENTICITE", "noyau_identitaire");
  if (positionnement || noyau) {
    blocks.push(
      kv([
        ["Position revendiquée", positionnement || "INSUFFISANT"],
        ["Ancrage non négociable", noyau || "INSUFFISANT"],
      ]),
      p(
        "Position dans la fenêtre culturelle : la lecture paramétrique par axe (visibilité, légitimité, différenciation, conversation) vit dans Cockpit → Intelligence et n'affiche que les axes documentés par des données réelles — les autres portent l'état INSUFFICIENT_DATA.",
      ),
    );
  } else {
    blocks.push(empty(INSUFFISANT, "Déclarez positionnement et noyau identitaire — sans eux, aucune position culturelle ne peut être énoncée."));
  }
  return { blocks, sources: ["Piliers A/D"] };
}

export function s35_signaux_faibles(ctx: OracleContext): SectionContent {
  const recent = ctx.signals.slice(0, 10);
  if (recent.length === 0) {
    return {
      blocks: [
        empty(
          INSUFFISANT,
          "Aucun signal sectoriel collecté. Branchez la veille (presse RSS, indicateurs macro) ou saisissez des signaux terrain dans Intelligence — cette section n'affiche jamais de tendances fabriquées.",
        ),
      ],
      sources: ["Signaux marché"],
    };
  }
  return {
    blocks: [
      table(
        ["Signal", "Source", "Date"],
        recent.map((s) => [
          s.summary ? `${s.title} — ${s.summary}` : s.title,
          s.source === "WORLD_BANK" ? "Macro" : s.source === "RSS_NEWS" ? "Presse" : "Terrain",
          s.publishedAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(s.publishedAt) : "—",
        ]),
      ),
      p("Un signal faible ne se traite pas : il se surveille. Reportez en revue ceux qui reviennent trois fois."),
    ],
    sources: ["Signaux marché (réels)"],
  };
}
