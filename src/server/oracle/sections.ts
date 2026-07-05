import type { OracleTier } from "@prisma/client";
import type { SectionContent } from "./blocks";
import type { OracleContext } from "./context";
import * as core from "./compose-core";
import * as ext from "./compose-extended";

// Registre des 35 sections de l'Oracle (cahier §5.1).
// 01–21 : composition 100 % déterministe. 22–35 : fallback déterministe honnête
// + enrichissement LLM optionnel (llmEligible).

export interface SectionDef {
  number: number;
  title: string;
  tier: OracleTier;
  llmEligible: boolean;
  compose: (ctx: OracleContext) => SectionContent;
}

export const ORACLE_SECTIONS: SectionDef[] = [
  { number: 1, title: "Executive Summary", tier: "CORE", llmEligible: false, compose: core.s01_executive },
  { number: 2, title: "Contexte & Défi", tier: "CORE", llmEligible: false, compose: core.s02_contexte },
  { number: 3, title: "Plateforme Stratégique", tier: "CORE", llmEligible: false, compose: core.s03_plateforme },
  { number: 4, title: "Proposition de Valeur", tier: "CORE", llmEligible: false, compose: core.s04_proposition },
  { number: 5, title: "Territoire Créatif", tier: "CORE", llmEligible: false, compose: core.s05_territoire },
  { number: 6, title: "Expérience & Engagement", tier: "CORE", llmEligible: false, compose: core.s06_experience },
  { number: 7, title: "SWOT Interne (Risque)", tier: "CORE", llmEligible: false, compose: core.s07_swot_interne },
  { number: 8, title: "SWOT Externe (Track)", tier: "CORE", llmEligible: false, compose: core.s08_swot_externe },
  { number: 9, title: "Signaux & Opportunités", tier: "CORE", llmEligible: false, compose: core.s09_signaux },
  { number: 10, title: "Catalogue d'Actions", tier: "CORE", llmEligible: false, compose: core.s10_catalogue_actions },
  { number: 11, title: "Plan d'Activation", tier: "CORE", llmEligible: false, compose: core.s11_plan_activation },
  { number: 12, title: "Fenêtre d'Overton", tier: "CORE", llmEligible: false, compose: core.s12_overton },
  { number: 13, title: "Médias & Distribution", tier: "CORE", llmEligible: false, compose: core.s13_medias },
  { number: 14, title: "Production & Livrables", tier: "CORE", llmEligible: false, compose: core.s14_production },
  { number: 15, title: "Profil Superfan", tier: "CORE", llmEligible: false, compose: core.s15_superfan },
  { number: 16, title: "KPIs & Mesure", tier: "CORE", llmEligible: false, compose: core.s16_kpis },
  { number: 17, title: "Croissance & Évolution", tier: "CORE", llmEligible: false, compose: core.s17_croissance },
  { number: 18, title: "Budget", tier: "CORE", llmEligible: false, compose: core.s18_budget },
  { number: 19, title: "Timeline & Gouvernance", tier: "CORE", llmEligible: false, compose: core.s19_timeline },
  { number: 20, title: "Équipe", tier: "CORE", llmEligible: false, compose: core.s20_equipe },
  { number: 21, title: "Conditions & Prochaines Étapes", tier: "CORE", llmEligible: false, compose: core.s21_conditions },
  { number: 22, title: "Programme Équipe/Crew", tier: "CORE", llmEligible: true, compose: ext.s22_crew },
  { number: 23, title: "Plan de Communication", tier: "CORE", llmEligible: true, compose: ext.s23_plan_comm },
  { number: 24, title: "McKinsey 7S", tier: "BIG4", llmEligible: true, compose: ext.s24_7s },
  { number: 25, title: "BCG Growth-Share Matrix", tier: "BIG4", llmEligible: true, compose: ext.s25_bcg },
  { number: 26, title: "Bain Net Promoter System", tier: "BIG4", llmEligible: true, compose: ext.s26_nps },
  { number: 27, title: "Deloitte Greenhouse (Talent)", tier: "BIG4", llmEligible: true, compose: ext.s27_talent },
  { number: 28, title: "McKinsey Three Horizons", tier: "BIG4", llmEligible: true, compose: ext.s28_horizons },
  { number: 29, title: "BCG Strategy Palette", tier: "BIG4", llmEligible: true, compose: ext.s29_palette },
  { number: 30, title: "Deloitte Budget Framework", tier: "BIG4", llmEligible: true, compose: ext.s30_budget_framework },
  { number: 31, title: "Cult Index — masse culturelle", tier: "DISTINCTIVE", llmEligible: true, compose: ext.s31_cult_index },
  { number: 32, title: "Matrice d'engagement (4 modes)", tier: "DISTINCTIVE", llmEligible: true, compose: ext.s32_engagement_matrix },
  { number: 33, title: "Devotion Ladder — hiérarchie superfans", tier: "DISTINCTIVE", llmEligible: true, compose: ext.s33_devotion },
  { number: 34, title: "Position fenêtre culturelle", tier: "DISTINCTIVE", llmEligible: true, compose: ext.s34_position_culturelle },
  { number: 35, title: "Signaux faibles sectoriels", tier: "DISTINCTIVE", llmEligible: true, compose: ext.s35_signaux_faibles },
];

export function sectionDef(number: number): SectionDef {
  const def = ORACLE_SECTIONS.find((s) => s.number === number);
  if (!def) throw new Error(`Section Oracle inconnue : ${number}`);
  return def;
}
