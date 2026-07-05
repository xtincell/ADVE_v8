import "server-only";
import PDFDocument from "pdfkit";
import type { Brand, OracleReport, OracleSection } from "@prisma/client";
import type { SectionContent } from "@/server/oracle/blocks";
import { TIER_LABELS } from "@/server/scoring/score";
import { BONE, CORAIL, GOLD, LINE, M, MUTED, NOIR, contentWidth, registerFonts, renderBlock, type Doc } from "./renderer";

// Rapport Oracle en PDF : couverture scellée (score, palier, hash), sommaire,
// 35 sections, pieds de page numérotés. Généré à la volée, jamais stocké.

function cover(doc: Doc, report: OracleReport, brand: Brand) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fillColor(NOIR).fill();
  doc.fillColor(BONE).font("mono").fontSize(10).text("UPGRADERS · LA FUSÉE", M, 120, { characterSpacing: 2 });
  doc.font("display").fontSize(38).fillColor("#ffffff").text("L'Oracle", M, 170);
  doc.font("display").fontSize(20).fillColor(CORAIL).text(brand.name, M, 225);
  doc.font("body").fontSize(11).fillColor(BONE).text(
    `Rapport de stratégie de marque — 35 sections\n${brand.sector ?? ""}${brand.city ? ` · ${brand.city}` : ""}`,
    M,
    260,
  );
  const y = 330;
  doc.font("mono").fontSize(44).fillColor("#ffffff").text(String(report.scoreAtGen), M, y);
  doc.font("mono").fontSize(12).fillColor(MUTED).text("/ 200", M + doc.widthOfString(String(report.scoreAtGen)) + 90, y + 26);
  doc.font("mono").fontSize(11).fillColor(GOLD).text(`PALIER ${TIER_LABELS[report.tierAtGen].toUpperCase()}`, M, y + 58, { characterSpacing: 1.5 });

  doc.font("mono").fontSize(8.5).fillColor(MUTED).text(
    [
      `Version ${report.version}`,
      `Généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(report.createdAt)}`,
      `Empreinte du socle : ${report.pillarsHash}`,
      report.stale ? "ATTENTION : le socle a évolué depuis la génération (rapport périmé)." : "Socle scellé — le rapport ne dit que ce que la marque a déclaré.",
    ].join("\n"),
    M,
    doc.page.height - 150,
    { lineGap: 3 },
  );
}

export interface OracleReportForPdf extends OracleReport {
  brand: Brand;
  sections: OracleSection[];
}

export function buildOraclePdf(report: OracleReportForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `Oracle — ${report.brand.name} (v${report.version})`, Author: "La Fusée · UPgraders" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerFonts(doc);
    cover(doc, report, report.brand);

    // Sommaire
    doc.addPage();
    doc.font("display").fontSize(18).fillColor(NOIR).text("Sommaire", M, M);
    doc.moveDown(0.8);
    for (const s of report.sections) {
      doc.font("body").fontSize(9.5).fillColor(s.status === "COMPLETE" ? NOIR : MUTED)
        .text(`${String(s.number).padStart(2, "0")}  ${s.title}${s.status !== "COMPLETE" ? `  — ${s.status}` : ""}`, { lineGap: 2 });
    }

    // Sections
    for (const s of report.sections) {
      doc.addPage();
      doc.font("mono").fontSize(9).fillColor(CORAIL).text(`SECTION ${String(s.number).padStart(2, "0")} · ${s.tier}`, M, M, { characterSpacing: 1 });
      doc.font("display").fontSize(17).fillColor(NOIR).text(s.title, M, doc.y + 4);
      doc.moveTo(M, doc.y + 8).lineTo(M + contentWidth(doc), doc.y + 8).strokeColor(LINE).lineWidth(1).stroke();
      doc.y += 20;

      if (s.status === "COMPLETE" && s.content) {
        const content = s.content as unknown as SectionContent;
        for (const block of content.blocks) renderBlock(doc, block);
        if (content.sources.length > 0) {
          doc.moveDown(0.4);
          doc.font("mono").fontSize(7.5).fillColor(MUTED).text(`Sources : ${content.sources.join(" · ")}`, M, doc.y);
        }
      } else {
        renderBlock(doc, {
          type: "empty",
          status: s.status,
          note:
            s.status === "STALE"
              ? "Cette section a été périmée par un amendement du socle — régénérez le rapport."
              : s.error ?? "Section non générée.",
        });
      }
    }

    // Pieds de page (numérotation + hash) sur toutes les pages sauf la couverture
    const range = doc.bufferedPageRange();
    for (let i = 1; i < range.count; i++) {
      doc.switchToPage(i);
      doc.font("mono").fontSize(7.5).fillColor(MUTED);
      const footerY = doc.page.height - 32;
      doc.text(`Oracle · ${report.brand.name} · v${report.version} · ${report.pillarsHash}`, M, footerY, { lineBreak: false });
      doc.text(`${i + 1} / ${range.count}`, doc.page.width - M - 60, footerY, { width: 60, align: "right", lineBreak: false });
    }

    doc.end();
  });
}
