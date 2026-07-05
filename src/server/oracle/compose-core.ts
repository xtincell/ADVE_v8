import { TIER_BOUNDS, TIER_LABELS } from "@/server/scoring/score";
import { pillarDef } from "@/server/brands/pillar-config";
import { callout, empty, kv, list, p, score, table, type SectionContent } from "./blocks";
import {
  fieldLabel,
  has,
  items,
  strongFields,
  superfans,
  text,
  type OracleContext,
} from "./context";

// Sections 01–21 (CORE) : composition 100 % déterministe — mapping direct des
// données piliers. Chaque section liste ses sources. Un manque = bloc `empty`.

const INSUFFISANT = "INSUFFISANT";

function need(what: string): ReturnType<typeof empty> {
  return empty(INSUFFISANT, `Donnée non déclarée : ${what}. Complétez le pilier correspondant puis régénérez cette section.`);
}

export function s01_executive(ctx: OracleContext): SectionContent {
  const blocks = [
    kv([
      ["Marque", ctx.brand.name],
      ["Secteur", ctx.brand.sector ?? "—"],
      ["Implantation", [ctx.brand.city, ctx.brand.country].filter(Boolean).join(", ") || "—"],
      ["Palier", TIER_LABELS[ctx.brand.tier]],
    ]),
    score("Score de marque", ctx.brand.score, 200),
  ];
  if (has(ctx, "DISTINCTION", "promesse_maitre")) {
    blocks.push(p(`Promesse maître : « ${text(ctx, "DISTINCTION", "promesse_maitre")} »`));
  }
  const forces = strongFields(ctx);
  if (forces.length > 0) {
    blocks.push(p("Points d'appui du socle (champs complets) :"), list(forces.slice(0, 6).map((f) => `${pillarDef(f.kind).name} — ${f.label}`)));
  }
  const risques = items(ctx, "RISQUE", "risques_prioritaires");
  if (risques.length > 0) {
    blocks.push(p("Risques prioritaires identifiés :"), list(risques.slice(0, 3)));
  }
  const priorites = items(ctx, "STRATEGIE", "priorites");
  if (priorites.length > 0) {
    blocks.push(p("Priorités du trimestre :"), list(priorites.slice(0, 3), true));
  } else {
    blocks.push(need("priorités stratégiques (recalculez le pilier Stratégie)"));
  }
  return { blocks, sources: ["Marque", "Piliers A/D/R/S"] };
}

export function s02_contexte(ctx: OracleContext): SectionContent {
  const blocks = [];
  if (has(ctx, "AUTHENTICITE", "histoire")) blocks.push(p(text(ctx, "AUTHENTICITE", "histoire")));
  else blocks.push(need("l'histoire de la marque (pilier Authenticité)"));
  blocks.push(
    kv([
      ["Secteur", ctx.brand.sector ?? "—"],
      ["Marché principal", [ctx.brand.city, ctx.brand.country].filter(Boolean).join(", ") || "—"],
    ]),
  );
  if (has(ctx, "ENGAGEMENT", "communaute")) {
    blocks.push(p(`État de la communauté déclaré : ${text(ctx, "ENGAGEMENT", "communaute")}`));
  }
  const risques = items(ctx, "RISQUE", "risques_prioritaires");
  blocks.push(
    risques.length > 0
      ? callout(`Le défi n°1 : ${risques[0]!.replace(/^P\d — /, "")}`, "warning")
      : need("le défi principal (recalculez le pilier Risque)"),
  );
  return { blocks, sources: ["Marque", "Piliers A/E/R"] };
}

export function s03_plateforme(ctx: OracleContext): SectionContent {
  const rows: [string, string][] = [];
  for (const key of ["noyau_identitaire", "archetype", "mission"] as const) {
    if (has(ctx, "AUTHENTICITE", key)) rows.push([fieldLabel("AUTHENTICITE", key), text(ctx, "AUTHENTICITE", key)]);
  }
  const blocks = [];
  if (rows.length > 0) blocks.push(kv(rows));
  const valeurs = items(ctx, "AUTHENTICITE", "valeurs");
  if (valeurs.length > 0) blocks.push(p("Valeurs cardinales :"), list(valeurs));
  if (rows.length === 0 && valeurs.length === 0) {
    blocks.push(need("le noyau identitaire, l'archétype, la mission et les valeurs (pilier Authenticité)"));
  }
  return { blocks, sources: ["Pilier A"] };
}

export function s04_proposition(ctx: OracleContext): SectionContent {
  const blocks = [];
  if (has(ctx, "DISTINCTION", "promesse_maitre")) {
    blocks.push(callout(`« ${text(ctx, "DISTINCTION", "promesse_maitre")} »`, "success"));
  } else blocks.push(need("la promesse maître (pilier Distinction)"));
  if (has(ctx, "VALEUR", "catalogue")) blocks.push(p(`Offre : ${text(ctx, "VALEUR", "catalogue")}`));
  else blocks.push(need("l'offre / catalogue (pilier Valeur)"));
  if (has(ctx, "VALEUR", "business_model")) blocks.push(p(`Modèle économique : ${text(ctx, "VALEUR", "business_model")}`));
  if (has(ctx, "VALEUR", "preuves")) blocks.push(p(`Preuves : ${text(ctx, "VALEUR", "preuves")}`));
  return { blocks, sources: ["Piliers D/V"] };
}

export function s05_territoire(ctx: OracleContext): SectionContent {
  const blocks = [];
  if (has(ctx, "DISTINCTION", "territoire_creatif")) blocks.push(p(text(ctx, "DISTINCTION", "territoire_creatif")));
  else blocks.push(need("le territoire créatif (pilier Distinction)"));
  const diff = items(ctx, "DISTINCTION", "differenciation");
  if (diff.length > 0) blocks.push(p("Différenciateurs revendiqués :"), list(diff));
  if (has(ctx, "DISTINCTION", "positionnement")) blocks.push(p(`Positionnement : ${text(ctx, "DISTINCTION", "positionnement")}`));
  return { blocks, sources: ["Pilier D"] };
}

export function s06_experience(ctx: OracleContext): SectionContent {
  const blocks = [];
  const canaux = items(ctx, "ENGAGEMENT", "canaux");
  if (canaux.length > 0) blocks.push(p("Canaux actifs :"), list(canaux));
  else blocks.push(need("les canaux (pilier Engagement)"));
  if (has(ctx, "ENGAGEMENT", "rituels")) blocks.push(p(`Rituels : ${text(ctx, "ENGAGEMENT", "rituels")}`));
  if (has(ctx, "ENGAGEMENT", "parcours_engagement")) {
    blocks.push(p(`Parcours d'engagement : ${text(ctx, "ENGAGEMENT", "parcours_engagement")}`));
  }
  return { blocks, sources: ["Pilier E"] };
}

export function s07_swot_interne(ctx: OracleContext): SectionContent {
  const forces = strongFields(ctx).map((f) => `${pillarDef(f.kind).name} — ${f.label} (déclaré et complet)`);
  const faiblesses = items(ctx, "RISQUE", "faiblesses");
  const blocks = [];
  blocks.push(p("Forces (champs du socle complets) :"));
  blocks.push(forces.length > 0 ? list(forces.slice(0, 8)) : need("aucun champ complet — renforcez le socle ADVE"));
  blocks.push(p("Faiblesses (dérivées du socle) :"));
  blocks.push(faiblesses.length > 0 ? list(faiblesses) : empty(INSUFFISANT, "Pilier Risque jamais calculé — lancez le recalcul."));
  return { blocks, sources: ["Piliers ADVE (complétude)", "Pilier R"] };
}

export function s08_swot_externe(ctx: OracleContext): SectionContent {
  const opportunites = items(ctx, "TRACK", "opportunites");
  const menaces = items(ctx, "RISQUE", "menaces");
  const blocks = [];
  blocks.push(p("Opportunités (dérivées du déclaré et des signaux) :"));
  blocks.push(opportunites.length > 0 ? list(opportunites) : empty(INSUFFISANT, "Aucune opportunité dérivable — complétez le socle et la veille (Sources), puis recalculez Track."));
  blocks.push(p("Menaces :"));
  blocks.push(menaces.length > 0 ? list(menaces) : empty(INSUFFISANT, "Aucune menace dérivée — recalculez le pilier Risque."));
  return { blocks, sources: ["Piliers R/T"] };
}

export function s09_signaux(ctx: OracleContext): SectionContent {
  const signaux = items(ctx, "TRACK", "signaux");
  const tendances = items(ctx, "TRACK", "tendances");
  const blocks = [];
  if (tendances.length > 0) blocks.push(p("Tendances captées :"), list(tendances));
  if (signaux.length > 0) blocks.push(p("Signaux marché :"), list(signaux));
  if (tendances.length === 0 && signaux.length === 0) {
    blocks.push(
      empty(
        INSUFFISANT,
        "Aucun signal marché réel disponible. Branchez la veille (presse sectorielle, indicateurs macro) ou saisissez des signaux terrain, puis recalculez Track — rien n'est fabriqué.",
      ),
    );
  }
  return { blocks, sources: ["Pilier T", "Signaux marché"] };
}

export function s10_catalogue_actions(ctx: OracleContext): SectionContent {
  const actions = items(ctx, "INNOVATION", "actions_candidates");
  const paris = items(ctx, "INNOVATION", "paris");
  const blocks = [];
  blocks.push(actions.length > 0 ? list(actions, true) : empty(INSUFFISANT, "Pilier Innovation jamais calculé — lancez le recalcul."));
  if (paris.length > 0) blocks.push(p("Paris audacieux :"), list(paris));
  return { blocks, sources: ["Pilier I"] };
}

export function s11_plan_activation(ctx: OracleContext): SectionContent {
  const plan = text(ctx, "STRATEGIE", "plan_activation");
  const priorites = items(ctx, "STRATEGIE", "priorites");
  const blocks = [];
  if (plan) {
    blocks.push(...plan.split("\n").filter(Boolean).map((line) => p(line)));
  } else {
    blocks.push(empty(INSUFFISANT, "Pilier Stratégie jamais calculé — lancez le recalcul de la chaîne."));
  }
  if (priorites.length > 0) blocks.push(p("Priorités :"), list(priorites, true));
  return { blocks, sources: ["Pilier S"] };
}

export function s12_overton(ctx: OracleContext): SectionContent {
  const blocks = [
    p(
      "La fenêtre d'Overton sectorielle désigne ce que le public de votre secteur considère comme « normal », « audacieux » ou « impensable ». Une marque devient icône en déplaçant cette fenêtre — pas en s'y conformant.",
    ),
  ];
  if (has(ctx, "DISTINCTION", "positionnement")) {
    blocks.push(p(`Position revendiquée aujourd'hui : ${text(ctx, "DISTINCTION", "positionnement")}`));
  } else {
    blocks.push(need("le positionnement (pilier Distinction) — impossible de situer la marque dans la fenêtre sans lui"));
  }
  const paris = items(ctx, "INNOVATION", "paris");
  if (paris.length > 0) {
    blocks.push(p("Gestes candidats pour déplacer la fenêtre (dérivés de votre socle) :"), list(paris));
  }
  blocks.push(
    callout(
      "Le radar sectoriel chiffré (position par axe, données de veille) vit dans Cockpit → Intelligence, avec ses états DEGRADED/INSUFFICIENT_DATA par axe — il n'affiche que ce que les données réelles permettent.",
    ),
  );
  return { blocks, sources: ["Piliers D/I"] };
}

export function s13_medias(ctx: OracleContext): SectionContent {
  const canaux = items(ctx, "ENGAGEMENT", "canaux");
  const blocks = [];
  if (canaux.length > 0) {
    blocks.push(
      p("Canaux déclarés et rôle recommandé dans le dispositif :"),
      table(
        ["Canal", "Rôle dans le dispositif"],
        canaux.map((c) => [c, roleForChannel(c)]),
      ),
    );
  } else {
    blocks.push(need("les canaux (pilier Engagement)"));
  }
  if (has(ctx, "VALEUR", "politique_prix")) {
    blocks.push(p(`Distribution & prix : ${text(ctx, "VALEUR", "politique_prix")}`));
  }
  return { blocks, sources: ["Piliers E/V"] };
}

function roleForChannel(canal: string): string {
  const c = canal.toLowerCase();
  if (c.includes("instagram") || c.includes("tiktok")) return "Vitrine & recrutement d'audience";
  if (c.includes("whatsapp")) return "Relation directe, conversion & fidélisation";
  if (c.includes("youtube")) return "Fond de marque & preuve longue durée";
  if (c.includes("facebook")) return "Communauté locale & événements";
  if (c.includes("site") || c.includes("web")) return "Socle propriétaire (owned) & conversion";
  if (c.includes("boutique") || c.includes("marché") || c.includes("corner") || c.includes("événement")) return "Expérience physique & rituels";
  if (c.includes("radio") || c.includes("tv")) return "Notoriété de masse locale";
  return "À qualifier avec l'opérateur";
}

export function s14_production(ctx: OracleContext): SectionContent {
  const blocks = [];
  if (ctx.assets.length > 0) {
    blocks.push(
      p("Assets de marque existants dans le vault :"),
      table(["Asset", "Type", "Statut"], ctx.assets.map((a) => [a.title, a.kind, a.status])),
    );
  } else {
    blocks.push(empty("VIDE", "Aucun asset dans le vault — la forge (Cockpit → Livrables) produit briefs, manifestes, positionnements et autres livrables depuis vos piliers."));
  }
  const actions = items(ctx, "INNOVATION", "actions_candidates");
  const productionNeeds = actions.filter((a) => /publi|vidéo|contenu|récit|visuel|étude|cas|shooting|format/i.test(a));
  if (productionNeeds.length > 0) {
    blocks.push(p("Besoins de production impliqués par le plan :"), list(productionNeeds));
  }
  return { blocks, sources: ["Vault d'assets", "Pilier I"] };
}

export function s15_superfan(ctx: OracleContext): SectionContent {
  const sf = superfans(ctx);
  const blocks = [];
  if (sf.length > 0) {
    blocks.push(
      p(`${sf.length} superfan${sf.length > 1 ? "s" : ""} identifié${sf.length > 1 ? "s" : ""} (échelons Ambassadeur & Évangéliste) :`),
      table(
        ["Nom", "Échelon", "Canal", "Ce qu'il/elle fait déjà"],
        sf.map((m) => [m.name, m.level === "EVANGELISTE" ? "Évangéliste" : "Ambassadeur", m.channel ?? "—", m.note ?? "—"]),
      ),
      callout("Le profil superfan type se lit dans ces lignes : ce sont vos données, pas un persona inventé.", "success"),
    );
  } else {
    blocks.push(
      empty(
        INSUFFISANT,
        "Aucun superfan recensé. Commencez le recensement manuel dans Cockpit → Intelligence → Communauté : qui sont les 10 personnes qui parlent déjà de vous ?",
      ),
    );
  }
  if (has(ctx, "ENGAGEMENT", "parcours_engagement")) {
    blocks.push(p(`Parcours vers le statut de superfan (déclaré) : ${text(ctx, "ENGAGEMENT", "parcours_engagement")}`));
  }
  return { blocks, sources: ["Communauté (réelle)", "Pilier E"] };
}

export function s16_kpis(ctx: OracleContext): SectionContent {
  const kpis = items(ctx, "STRATEGIE", "kpis");
  const blocks = [];
  blocks.push(
    kpis.length > 0
      ? list(kpis)
      : empty(INSUFFISANT, "Pilier Stratégie jamais calculé — les KPIs se dérivent de vos canaux et de votre socle."),
  );
  blocks.push(
    callout(
      "Rythme de mesure recommandé par la méthode : score de marque à chaque amendement (automatique), revue des KPIs à chaque revue mensuelle.",
    ),
  );
  return { blocks, sources: ["Pilier S"] };
}

export function s17_croissance(ctx: OracleContext): SectionContent {
  const tier = ctx.brand.tier;
  const bounds = TIER_BOUNDS[tier];
  const tiers = Object.entries(TIER_BOUNDS) as [keyof typeof TIER_BOUNDS, [number, number]][];
  const currentIdx = tiers.findIndex(([t]) => t === tier);
  const next = tiers[currentIdx + 1];
  const blocks = [
    score(`Palier actuel : ${TIER_LABELS[tier]}`, ctx.brand.score, 200),
    p(`La marque se situe dans la tranche ${bounds[0]}–${bounds[1]} points.`),
  ];
  if (next) {
    const gap = next[1][0] - ctx.brand.score;
    const weakest = (Object.entries(ctx.pillarScores) as [string, number][])
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([k, v]) => `${pillarDef(k as never).name} (${v}/25)`);
    blocks.push(
      p(`Prochain palier : ${TIER_LABELS[next[0]]} à ${next[1][0]} points — il manque ${gap} point${gap > 1 ? "s" : ""}.`),
      p("Piliers les plus faibles (levier de progression le plus direct) :"),
      list(weakest),
    );
  } else {
    blocks.push(callout("Palier maximal atteint — l'enjeu devient la tenue dans la durée (fraîcheur du socle et de la stratégie).", "success"));
  }
  if (has(ctx, "VALEUR", "business_model")) {
    blocks.push(p(`Trajectoire économique déclarée : ${text(ctx, "VALEUR", "business_model")}`));
  }
  return { blocks, sources: ["Score & paliers", "Pilier V"] };
}

export function s18_budget(ctx: OracleContext): SectionContent {
  const actions = items(ctx, "INNOVATION", "actions_candidates");
  const blocks = [
    p(
      "Les montants se définissent avec l'opérateur selon vos moyens réels — ce cadre liste les postes budgétaires qu'implique votre plan, sans chiffres inventés.",
    ),
  ];
  if (actions.length > 0) {
    blocks.push(
      table(
        ["Poste impliqué par le plan", "Origine"],
        actions.slice(0, 8).map((a) => [budgetPost(a), a.length > 90 ? `${a.slice(0, 90)}…` : a]),
      ),
    );
  } else {
    blocks.push(empty(INSUFFISANT, "Aucune action candidate — recalculez le pilier Innovation pour dériver les postes."));
  }
  if (has(ctx, "VALEUR", "politique_prix")) {
    blocks.push(p(`Cadre de prix déclaré : ${text(ctx, "VALEUR", "politique_prix")}`));
  }
  return { blocks, sources: ["Piliers I/V"] };
}

function budgetPost(action: string): string {
  const a = action.toLowerCase();
  if (/vidéo|shooting|photo|visuel|contenu|format/.test(a)) return "Production de contenu";
  if (/événement|rituel|rendez-vous|atelier/.test(a)) return "Événementiel & rituels";
  if (/site|web|plateforme|instrument/.test(a)) return "Digital & outillage";
  if (/étude|test|client|recensement|preuve/.test(a)) return "Études & preuve";
  if (/ambassadeur|communauté|membre/.test(a)) return "Animation de communauté";
  if (/prix|catalogue|offre|gamme/.test(a)) return "Offre & pricing";
  return "Conseil & pilotage";
}

export function s19_timeline(ctx: OracleContext): SectionContent {
  const plan = text(ctx, "STRATEGIE", "plan_activation");
  const blocks = [];
  if (plan) {
    const phases = plan.split("\n").filter(Boolean);
    blocks.push(table(["Phase", "Contenu"], phases.map((ph) => {
      const [head, ...rest] = ph.split("—");
      return [head?.trim() ?? ph, rest.join("—").trim() || "—"];
    })));
  } else {
    blocks.push(empty(INSUFFISANT, "Pilier Stratégie jamais calculé — le séquencement 30/60/90 jours se dérive du plan."));
  }
  blocks.push(
    p("Gouvernance de la méthode :"),
    list([
      "Chaque amendement du socle recalcule le score et périme la stratégie en aval (visible dans le Cockpit).",
      "Revue mensuelle : score, palier, avancement des priorités, décisions d'amendement.",
      "Chaque décision structurante s'écrit dans les piliers — le rapport suivant en héritera.",
    ]),
  );
  return { blocks, sources: ["Pilier S", "Méthode"] };
}

export function s20_equipe(ctx: OracleContext): SectionContent {
  const canaux = items(ctx, "ENGAGEMENT", "canaux");
  const actions = items(ctx, "INNOVATION", "actions_candidates");
  const roles = new Set<string>();
  for (const c of canaux) {
    const cl = c.toLowerCase();
    if (/(instagram|tiktok|facebook|x |twitter|youtube)/.test(cl)) roles.add("Gestion des réseaux & création de contenu");
    if (/whatsapp/.test(cl)) roles.add("Relation client & communauté (WhatsApp)");
    if (/boutique|corner|marché|événement/.test(cl)) roles.add("Retail & expérience physique");
    if (/site|web/.test(cl)) roles.add("Web & e-commerce");
  }
  if (actions.some((a) => /vidéo|shooting|visuel/i.test(a))) roles.add("Production audiovisuelle (interne ou Guilde)");
  const blocks = [];
  if (roles.size > 0) {
    blocks.push(p("Fonctions impliquées par vos canaux et votre plan (à couvrir en interne ou via La Guilde) :"), list([...roles]));
  } else {
    blocks.push(empty(INSUFFISANT, "Déclarez vos canaux (pilier Engagement) pour dériver les fonctions à couvrir."));
  }
  blocks.push(callout("La composition nominative de l'équipe se documente avec l'opérateur — cette section ne devine pas des organigrammes."));
  return { blocks, sources: ["Piliers E/I"] };
}

export function s21_conditions(ctx: OracleContext): SectionContent {
  return {
    blocks: [
      p(
        `Ce rapport a été généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(ctx.generatedAt)} à partir des piliers de ${ctx.brand.name} tels que déclarés à cette date. Il est scellé par une empreinte numérique : toute évolution du socle appelle une régénération.`,
      ),
      p("Prochaines étapes recommandées par la méthode :"),
      list(
        [
          "Traiter les risques prioritaires (section 1) avant toute dépense d'amplification.",
          "Compléter les champs marqués INSUFFISANT — chaque complétion augmente le score et enrichit le prochain rapport.",
          "Passer en pilotage continu (Cockpit) : amendements, recalculs, suivi de communauté.",
          "Confier les besoins de production à La Guilde avec des briefs dérivés de ce rapport.",
        ],
        true,
      ),
      callout("Le score et les analyses de ce rapport sont reproductibles : mêmes données déclarées, mêmes résultats — c'est la garantie d'honnêteté de la méthode.", "success"),
    ],
    sources: ["Méthode"],
  };
}
