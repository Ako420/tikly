import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Language, TierName } from '../types/enums';
import { formatDateTime, formatXaf } from '../util/format';
import { t } from '../util/i18n';

export type TicketPdfData = {
  code: string;
  qrToken: string;
  tier: TierName;
  price: number;
  holderName: string;
  eventTitle: string;
  startAt: Date;
  venue: string;
  city: string;
};

const INK = '#111827';
const MUTED = '#6B7280';
const ACCENT = '#7C3AED';
const QR_SIZE = 150;

const plain = (text: string) => text.replace(/[   ]/g, ' ');

function drawTicket(doc: PDFKit.PDFDocument, ticket: TicketPdfData, qr: Buffer, lang: Language) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  const top = doc.page.margins.top;
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED)
    .text(t('pdf.title', lang).toUpperCase(), left, top + 2, {
      width,
      align: 'right',
    });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(ACCENT).text('TIKLY', left, top);
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text(plain(ticket.eventTitle), { width });
  doc.moveDown(0.4);

  const row = (label: string, value: string) => {
    doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(label.toUpperCase());
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(plain(value), { width });
    doc.moveDown(0.3);
  };
  row(t('pdf.when', lang), formatDateTime(ticket.startAt, lang));
  row(t('pdf.where', lang), `${ticket.venue}, ${ticket.city}`);
  row(
    t('pdf.tier', lang),
    `${t(`email.tiers.${ticket.tier}`, lang)} · ${ticket.price ? formatXaf(ticket.price) : t('pdf.free', lang)}`,
  );
  row(t('pdf.holder', lang), ticket.holderName);

  const qrTop = doc.y + 4;
  doc.image(qr, left + (width - QR_SIZE) / 2, qrTop, { width: QR_SIZE, height: QR_SIZE });
  doc.y = qrTop + QR_SIZE + 6;
  doc.font('Courier-Bold').fontSize(13).fillColor(INK).text(ticket.code, left, doc.y, { width, align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(t('pdf.scan', lang), { width, align: 'center' });
}

export async function buildTicketsPdf(tickets: TicketPdfData[], lang: Language): Promise<Buffer> {
  const codes = await Promise.all(
    tickets.map((ticket) => QRCode.toBuffer(ticket.qrToken, { errorCorrectionLevel: 'M', margin: 1, width: 320 })),
  );
  const doc = new PDFDocument({
    size: 'A6',
    margin: 22,
    autoFirstPage: false,
    info: { Title: plain(`Tikly – ${tickets[0]?.eventTitle ?? ''}`), Author: 'Tikly' },
  });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  tickets.forEach((ticket, index) => {
    doc.addPage();
    drawTicket(doc, ticket, codes[index]!, lang);
  });
  doc.end();
  return finished;
}
