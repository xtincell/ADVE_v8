import "server-only";
import PDFDocument from "pdfkit";
import type { IntakeSession } from "@prisma/client";
import { kv, list, p, score, callout, empty, type Block } from "@/server/oracle/blocks";
import { deriveRtis } from "@/server/brands/rtis-derive";
import { ADVE_KINDS, pillarDef } from "@/server/brands/pillar-config";
import { scorePillar, PILLAR_MAX, TIER_LABELS } from "@/server/scoring/score";
import type { DraftPillars, IntakeAnswers } from "@/server/intake";
import { BONE, CORAIL, GOLD, LINE, M, MUTED, NOIR, contentWidth, registerFonts, renderBlock, type Doc } from "./renderer";

// Rapport PDF léger du diagnostic (one-shot INTAKE_PDF, cahier §4.1).
// Composé des seules données déclarées dans l'intake — même moteur de blocs.

interface IntakeSectionDef {
  title: string;
  blocks: Block[];
}

function composeIntakeSections(session: IntakeSession): IntakeSectionDef[] {
  const answers = session.answers as Partial<IntakeAnswers>;
  const draft = (session.draftFields ?? {}) as unknown as DraftPillars;
  const sections: IntakeSectionDef[] = [];

  sections.push({
    title: "Résumé du diagnostic",
    blocks: [
      kv([
        ["Marque", answers.brandName ?? "—"],
        ["Secteur", answers.sector ?? "—"],
        ["Implantation", [answers.city, answers.country].filter(Boolean).join(", ") || "—"],
        ["Date du diagnostic", new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(session.submittedAt ?? session.updatedAt)],
      ]),
      score("Score de marque (socle fondateur)", session.score ?? 0, 200),
      p(`Palier : ${TIER_LABELS[session.tier ?? "LATENT"]}. Le score mesure la complétude structurelle des 4 piliers fondateurs — il est déterministe et reproductible. Les 4 piliers stratégiques dérivés s'activent dans le Cockpit et peuvent porter la marque jusqu'à 200.`),
    ],
  });

  for (const kind of ADVE_KINDS) {
    const def = pillarDef(kind);
    const fields = draft[kind] ?? {};
    const pScore = scorePillar(kind, fields);
    const blocks: Block[] = [score(`${def.letter} · ${def.name}`, pScore, PILLAR_MAX)];
    const declared: [string, string][] = [];
    const missing: string[] = [];
    for (const f of def.fields) {
      const state = fields[f.key];
      const value = state ? (Array.isArray(state.value) ? state.value.join(" · ") : state.value) : "";
      if (value) declared.push([f.label, value]);
      else missing.push(f.label);
    }
    if (declared.length > 0) blocks.push(kv(declared));
    else blocks.push(empty("VIDE", "Aucune donnée déclarée sur ce pilier."));
    if (missing.length > 0) {
      blocks.push(callout(`À travailler : ${missing.join(", ")}.`, "warning"));
    }
    sections.push({ title: `Pilier ${def.letter} — ${def.name}`, blocks });
  }

  const risque = deriveRtis(
    "RISQUE",
    draft,
    { sector: answers.sector ?? null, country: answers.country ?? null, signals: [] },
    {},
  );
  const faiblesses = (risque.faiblesses as string[]) ?? [];
  const priorites = (risque.risques_prioritaires as string[]) ?? [];
  sections.push({
    title: "Première analyse de risque",
    blocks: [
      p("Dérivée exclusivement de vos réponses — chaque point remonte à un champ déclaré (ou manquant)."),
      faiblesses.length > 0 ? list(faiblesses) : empty("INSUFFISANT", "Rien à dériver : socle très complet."),
      ...(priorites.length > 0 ? [p("Priorités :"), list(priorites, true)] : []),
    ],
  });

  sections.push({
    title: "Prochaines étapes",
    blocks: [
      list(
        [
          "Activez votre Cockpit (gratuit) pour amender vos piliers champ par champ.",
          "Complétez les champs manquants listés ci-dessus — chaque complétion fait monter le score.",
          "Recalculez la stratégie (R→T→I→S) pour obtenir plan, priorités et KPIs dérivés.",
          "Passez à l'Oracle (35 sections) pour la stratégie complète, exportable et partageable.",
        ],
        true,
      ),
      callout("Ce rapport ne contient que ce que vous avez déclaré — aucune donnée n'a été inventée.", "success"),
    ],
  });

  return sections;
}

export function buildIntakePdf(session: IntakeSession): Promise<Buffer> {
  const answers = session.answers as Partial<IntakeAnswers>;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: M,
      bufferPages: true,
      info: { Title: `Diagnostic — ${answers.brandName ?? "Marque"}`, Author: "La Fusée · UPgraders" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerFonts(doc);

    // Couverture
    doc.rect(0, 0, doc.page.width, doc.page.height).fillColor(NOIR).fill();
    doc.fillColor(BONE).font("mono").fontSize(10).text("UPGRADERS · LA FUSÉE", M, 120, { characterSpacing: 2 });
    doc.font("display").fontSize(34).fillColor("#ffffff").text("Diagnostic de marque", M, 170);
    doc.font("display").fontSize(20).fillColor(CORAIL).text(answers.brandName ?? "—", M, 225);
    doc.font("mono").fontSize(44).fillColor("#ffffff").text(String(session.score ?? 0), M, 300);
    doc.font("mono").fontSize(11).fillColor(GOLD).text(`PALIER ${TIER_LABELS[session.tier ?? "LATENT"].toUpperCase()}`, M, 356, { characterSpacing: 1.5 });
    doc.font("mono").fontSize(8.5).fillColor(MUTED).text(
      `Généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date())} · rapport léger — l'Oracle complet (35 sections) est disponible séparément.`,
      M,
      doc.page.height - 130,
    );

    for (const section of composeIntakeSections(session)) {
      doc.addPage();
      doc.font("display").fontSize(16).fillColor(NOIR).text(section.title, M, M);
      doc.moveTo(M, doc.y + 6).lineTo(M + contentWidth(doc), doc.y + 6).strokeColor(LINE).lineWidth(1).stroke();
      doc.y += 18;
      for (const block of section.blocks) renderBlock(doc as Doc, block);
    }

    const range = doc.bufferedPageRange();
    for (let i = 1; i < range.count; i++) {
      doc.switchToPage(i);
      doc.font("mono").fontSize(7.5).fillColor(MUTED);
      const footerY = doc.page.height - 32;
      doc.text(`Diagnostic · ${answers.brandName ?? ""} · La Fusée by UPgraders`, M, footerY, { lineBreak: false });
      doc.text(`${i + 1} / ${range.count}`, doc.page.width - M - 60, footerY, { width: 60, align: "right", lineBreak: false });
    }

    doc.end();
  });
}
