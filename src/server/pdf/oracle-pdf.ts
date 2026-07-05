import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Brand, OracleReport, OracleSection } from "@prisma/client";
import type { Block, SectionContent } from "@/server/oracle/blocks";
import { TIER_LABELS } from "@/server/scoring/score";

// Pile PDF UNIQUE du produit (cahier §5.1) : PDFKit, zéro Chromium.
// Rendu du même modèle de blocs que le web. Snapshot horodaté + hash en pied de page.

const FONTS = path.join(process.cwd(), "src", "assets", "fonts");
const CORAIL = "#E56458";
const NOIR = "#16130f";
const MUTED = "#57503f";
const LINE = "#e2d8c6";
const GOLD = "#ca8a04";
const BONE = "#f6f2ea";

const M = 56; // marge

type Doc = InstanceType<typeof PDFDocument>;

function registerFonts(doc: Doc) {
  doc.registerFont("body", path.join(FONTS, "Satoshi-Regular.otf"));
  doc.registerFont("body-bold", path.join(FONTS, "Satoshi-Bold.otf"));
  doc.registerFont("display", path.join(FONTS, "ClashDisplay-Semibold.otf"));
  doc.registerFont("mono", path.join(FONTS, "JetBrainsMono-Regular.ttf"));
}

function contentWidth(doc: Doc): number {
  return doc.page.width - M * 2;
}

function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > doc.page.height - M - 24) doc.addPage();
}

function renderBlock(doc: Doc, block: Block) {
  const w = contentWidth(doc);
  switch (block.type) {
    case "p": {
      ensureSpace(doc, 40);
      doc.font("body").fontSize(10.5).fillColor(NOIR).text(block.text, M, doc.y, { width: w, lineGap: 3 });
      doc.moveDown(0.6);
      break;
    }
    case "list": {
      block.items.forEach((item, i) => {
        ensureSpace(doc, 30);
        const bullet = block.ordered ? `${i + 1}.` : "•";
        doc.font("body-bold").fontSize(10.5).fillColor(CORAIL).text(bullet, M + 4, doc.y, { continued: false, width: 18 });
        doc.moveUp();
        doc.font("body").fontSize(10.5).fillColor(NOIR).text(item, M + 24, doc.y, { width: w - 24, lineGap: 2 });
        doc.moveDown(0.25);
      });
      doc.moveDown(0.5);
      break;
    }
    case "kv": {
      for (const [k, v] of block.rows) {
        const vh = doc.font("body").fontSize(10.5).heightOfString(v, { width: w - 150 });
        ensureSpace(doc, Math.max(vh, 14) + 8);
        const y = doc.y;
        doc.font("body-bold").fontSize(9).fillColor(MUTED).text(k.toUpperCase(), M, y + 1, { width: 140 });
        doc.font("body").fontSize(10.5).fillColor(NOIR).text(v, M + 150, y, { width: w - 150, lineGap: 2 });
        doc.y = Math.max(doc.y, y + Math.max(vh, 14)) + 6;
      }
      doc.moveDown(0.4);
      break;
    }
    case "table": {
      const cols = block.head.length;
      const colW = w / cols;
      const pad = 6;
      // entête
      ensureSpace(doc, 40);
      let y = doc.y;
      doc.font("body-bold").fontSize(8.5).fillColor(MUTED);
      block.head.forEach((h, i) => doc.text(h.toUpperCase(), M + i * colW + pad, y, { width: colW - pad * 2 }));
      y = doc.y + 4;
      doc.moveTo(M, y).lineTo(M + w, y).strokeColor(NOIR).lineWidth(0.8).stroke();
      doc.y = y + 6;
      // lignes
      for (const row of block.rows) {
        doc.font("body").fontSize(9.5);
        const h = Math.max(
          ...row.map((cell) => doc.heightOfString(cell ?? "", { width: colW - pad * 2, lineGap: 1 })),
          12,
        );
        ensureSpace(doc, h + 10);
        const rowY = doc.y;
        row.forEach((cell, i) => {
          doc.fillColor(NOIR).text(cell ?? "", M + i * colW + pad, rowY, { width: colW - pad * 2, lineGap: 1 });
        });
        const endY = rowY + h + 5;
        doc.moveTo(M, endY).lineTo(M + w, endY).strokeColor(LINE).lineWidth(0.5).stroke();
        doc.y = endY + 5;
      }
      doc.moveDown(0.5);
      break;
    }
    case "callout": {
      doc.font("body").fontSize(10);
      const h = doc.heightOfString(block.text, { width: w - 28, lineGap: 2 }) + 20;
      ensureSpace(doc, h + 10);
      const y = doc.y;
      const color = block.tone === "warning" ? GOLD : block.tone === "success" ? "#2f9e63" : CORAIL;
      doc.roundedRect(M, y, w, h, 6).fillColor(BONE).fill();
      doc.rect(M, y, 3, h).fillColor(color).fill();
      doc.fillColor(NOIR).text(block.text, M + 16, y + 10, { width: w - 28, lineGap: 2 });
      doc.y = y + h + 10;
      break;
    }
    case "score": {
      ensureSpace(doc, 46);
      const y = doc.y;
      doc.font("body-bold").fontSize(10).fillColor(NOIR).text(block.label, M, y);
      doc.font("mono").fontSize(13).fillColor(CORAIL).text(`${block.value} / ${block.max}`, M, doc.y + 2);
      const barY = doc.y + 6;
      doc.roundedRect(M, barY, w, 6, 3).fillColor(LINE).fill();
      doc.roundedRect(M, barY, Math.max(6, w * (block.value / block.max)), 6, 3).fillColor(CORAIL).fill();
      doc.y = barY + 18;
      break;
    }
    case "empty": {
      doc.font("body").fontSize(9.5);
      const h = doc.heightOfString(block.note, { width: w - 28, lineGap: 2 }) + 30;
      ensureSpace(doc, h + 8);
      const y = doc.y;
      doc.roundedRect(M, y, w, h, 6).dash(3, { space: 3 }).strokeColor(MUTED).lineWidth(0.8).stroke().undash();
      doc.font("mono").fontSize(8).fillColor(GOLD).text(block.status, M + 14, y + 9);
      doc.font("body").fontSize(9.5).fillColor(MUTED).text(block.note, M + 14, doc.y + 3, { width: w - 28, lineGap: 2 });
      doc.y = y + h + 10;
      break;
    }
  }
}

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
