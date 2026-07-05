import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Block } from "@/server/oracle/blocks";

// Moteur de rendu PDF partagé (pile UNIQUE du produit — cahier §5.1) : PDFKit,
// zéro Chromium. Rend le même modèle de blocs que le web.

export const FONTS = path.join(process.cwd(), "src", "assets", "fonts");
export const CORAIL = "#E56458";
export const NOIR = "#16130f";
export const MUTED = "#57503f";
export const LINE = "#e2d8c6";
export const GOLD = "#ca8a04";
export const BONE = "#f6f2ea";

export const M = 56; // marge

export type Doc = InstanceType<typeof PDFDocument>;

export function registerFonts(doc: Doc) {
  doc.registerFont("body", path.join(FONTS, "Satoshi-Regular.otf"));
  doc.registerFont("body-bold", path.join(FONTS, "Satoshi-Bold.otf"));
  doc.registerFont("display", path.join(FONTS, "ClashDisplay-Semibold.otf"));
  doc.registerFont("mono", path.join(FONTS, "JetBrainsMono-Regular.ttf"));
}

export function contentWidth(doc: Doc): number {
  return doc.page.width - M * 2;
}

export function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > doc.page.height - M - 24) doc.addPage();
}

export function renderBlock(doc: Doc, block: Block) {
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

