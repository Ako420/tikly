import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { create } from 'qrcode';
import { palette } from '@/theme';

export type TicketPdfPage = {
  title: string;
  eyebrow: string;
  code: string;
  qrToken: string;
  details: { label: string; value: string }[];
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

function qrGrid(token: string) {
  if (!token) return '';
  const { modules } = create(token, { errorCorrectionLevel: 'M' });
  const cells: string[] = [];
  for (let row = 0; row < modules.size; row += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      cells.push(modules.get(row, col) ? '<i class="on"></i>' : '<i></i>');
    }
  }
  return `<div class="qr" style="grid-template-columns: repeat(${modules.size}, 1fr)">${cells.join('')}</div>`;
}

const page = (ticket: TicketPdfPage) => `
  <section class="ticket">
    <p class="eyebrow">${escapeHtml(ticket.eyebrow)}</p>
    <h1>${escapeHtml(ticket.title)}</h1>
    <div class="tile">${qrGrid(ticket.qrToken)}</div>
    <p class="code">${escapeHtml(ticket.code)}</p>
    <div class="details">
      ${ticket.details
        .map((detail) => `<div><span>${escapeHtml(detail.label)}</span><strong>${escapeHtml(detail.value)}</strong></div>`)
        .join('')}
    </div>
  </section>`;

const html = (tickets: TicketPdfPage[]) => `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Helvetica, Arial, sans-serif; color: ${palette.ink900}; }
  .ticket { page-break-after: always; padding: 48px 40px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .eyebrow { color: ${palette.violet600}; font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; }
  h1 { font-size: 24px; font-weight: 800; text-align: center; }
  .tile { border: 1px solid ${palette.line200}; border-radius: 16px; padding: 16px; }
  .qr { display: grid; width: 280px; height: 280px; }
  .qr i { display: block; }
  .qr i.on { background: ${palette.ink900}; }
  .code { font-size: 22px; font-weight: 800; letter-spacing: 2px; }
  .details { display: flex; gap: 24px; background: ${palette.violet50}; border-radius: 14px; padding: 12px 20px; }
  .details span { display: block; color: ${palette.ink600}; font-size: 12px; }
  .details strong { font-size: 14px; }
</style></head><body>${tickets.map(page).join('')}</body></html>`;

export async function shareTicketsPdf(tickets: TicketPdfPage[], fileName: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  const { base64 } = await Print.printToFileAsync({ html: html(tickets), base64: true });
  if (!base64) throw new Error('The PDF could not be generated');
  const pdf = new File(Paths.cache, `${fileName}.pdf`);
  await pdf.write(base64, { encoding: 'base64' });
  await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
}
