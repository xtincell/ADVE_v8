// Modèle de contenu unique des sections Oracle : les mêmes blocs se rendent
// en web (composants) et en PDF (PDFKit). Le bloc `empty` matérialise
// l'honest-empty : un manque s'affiche comme un manque, jamais comblé.

export type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "kv"; rows: [string, string][] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "callout"; text: string; tone?: "info" | "warning" | "success" }
  | { type: "score"; label: string; value: number; max: number }
  | { type: "empty"; status: string; note: string };

export interface SectionContent {
  blocks: Block[];
  /** Sources des données (piliers, communauté, signaux) — traçabilité « le rapport ne dit que le déclaré ». */
  sources: string[];
}

export const p = (text: string): Block => ({ type: "p", text });
export const list = (items: string[], ordered = false): Block => ({ type: "list", items, ordered });
export const kv = (rows: [string, string][]): Block => ({ type: "kv", rows });
export const table = (head: string[], rows: string[][]): Block => ({ type: "table", head, rows });
export const callout = (text: string, tone: "info" | "warning" | "success" = "info"): Block => ({ type: "callout", text, tone });
export const score = (label: string, value: number, max: number): Block => ({ type: "score", label, value, max });
export const empty = (status: string, note: string): Block => ({ type: "empty", status, note });
