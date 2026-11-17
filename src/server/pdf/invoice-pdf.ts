import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { formatDate } from "@/domain/dates";
import { formatQuantity, formatTaxRate } from "@/domain/invoice";
import { formatMoney } from "@/domain/money";

/** Standard PDF fonts only support WinAnsi: replace anything outside it. */
function safe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[  ]/g, " ")
    .replace(/[^\x20-\x7e -ÿ]/g, "?");
}

export interface InvoicePdfData {
  number: string;
  status: string;
  issueDate: string;
  dueDate: string;
  company: { name: string };
  client: { name: string; address: string | null; email: string | null; taxId: string | null };
  lines: { description: string; quantityMilli: number; unitPrice: number; amount: number }[];
  subtotal: number;
  taxRateBp: number;
  taxAmount: number;
  total: number;
  paid: number;
  remaining: number;
  notes: string | null;
}

const A4: [number, number] = [595.28, 841.89];
const INK = rgb(0.06, 0.09, 0.16);
const BRAND = rgb(0.06, 0.3, 0.36);
const MUTED = rgb(0.39, 0.45, 0.53);
const RULE = rgb(0.89, 0.9, 0.92);

interface TextOptions {
  font?: PDFFont;
  size?: number;
  color?: RGB;
  alignRight?: boolean;
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Facture ${data.number}`);
  doc.setCreator("CashPilot");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const right = A4[0] - margin;
  let page = doc.addPage(A4);
  let y = 790;

  const text = (p: PDFPage, value: string, x: number, yy: number, opts: TextOptions = {}) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10;
    const v = safe(value);
    const xx = opts.alignRight ? x - font.widthOfTextAtSize(v, size) : x;
    p.drawText(v, { x: xx, y: yy, size, font, color: opts.color ?? INK });
  };

  // Header
  text(page, data.company.name, margin, y, { font: bold, size: 16, color: BRAND });
  text(page, "FACTURE", right, y, { font: bold, size: 20, alignRight: true });
  y -= 22;
  text(page, `N° ${data.number}`, right, y, { size: 11, alignRight: true });
  y -= 15;
  text(page, `Date d'émission : ${formatDate(data.issueDate)}`, right, y, { alignRight: true, color: MUTED });
  y -= 14;
  text(page, `Échéance : ${formatDate(data.dueDate)}`, right, y, { alignRight: true, color: MUTED });
  if (data.status === "CANCELLED") {
    y -= 18;
    text(page, "FACTURE ANNULÉE", right, y, { font: bold, size: 12, alignRight: true, color: rgb(0.78, 0.16, 0.16) });
  }

  // Client
  y -= 40;
  text(page, "Facturé à", margin, y, { font: bold, color: MUTED });
  y -= 16;
  text(page, data.client.name, margin, y, { font: bold, size: 12 });
  for (const line of [data.client.address, data.client.email, data.client.taxId ? `MF : ${data.client.taxId}` : null]) {
    if (!line) continue;
    y -= 14;
    text(page, line, margin, y, { color: MUTED });
  }

  // Lines
  const cols = { qty: 360, price: 450, amount: right - 6 };
  const header = () => {
    page.drawRectangle({ x: margin, y: y - 6, width: right - margin, height: 22, color: rgb(0.95, 0.96, 0.97) });
    text(page, "Description", margin + 6, y, { font: bold });
    text(page, "Qté", cols.qty, y, { font: bold, alignRight: true });
    text(page, "PU HT", cols.price, y, { font: bold, alignRight: true });
    text(page, "Montant HT", cols.amount, y, { font: bold, alignRight: true });
    y -= 24;
  };
  y -= 36;
  header();
  for (const line of data.lines) {
    if (y < 160) {
      page = doc.addPage(A4);
      y = 790;
      header();
    }
    const description = line.description.length > 55 ? `${line.description.slice(0, 54)}...` : line.description;
    text(page, description, margin + 6, y);
    text(page, formatQuantity(line.quantityMilli), cols.qty, y, { alignRight: true });
    text(page, formatMoney(line.unitPrice), cols.price, y, { alignRight: true });
    text(page, formatMoney(line.amount), cols.amount, y, { alignRight: true });
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: right, y }, thickness: 0.5, color: RULE });
    y -= 14;
  }

  // Totals
  y -= 10;
  const totals: [string, string, boolean][] = [
    ["Total HT", formatMoney(data.subtotal), false],
    [`TVA ${formatTaxRate(data.taxRateBp)}`, formatMoney(data.taxAmount), false],
    ["Total TTC", formatMoney(data.total), true],
    ["Déjà réglé", formatMoney(data.paid), false],
    ["Reste à payer", formatMoney(data.remaining), true],
  ];
  for (const [label, value, strong] of totals) {
    text(page, label, 380, y, { font: strong ? bold : regular });
    text(page, value, cols.amount, y, { font: strong ? bold : regular, alignRight: true });
    y -= 16;
  }

  if (data.notes) {
    y -= 20;
    text(page, "Notes", margin, y, { font: bold, color: MUTED });
    y -= 14;
    for (const chunk of data.notes.match(/.{1,95}(\s|$)/g) ?? []) {
      text(page, chunk.trim(), margin, y, { color: MUTED });
      y -= 13;
    }
  }

  text(page, "Document généré par CashPilot", margin, 40, { size: 8, color: MUTED });
  return doc.save();
}
