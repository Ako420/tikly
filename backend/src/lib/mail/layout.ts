import { t } from '../../util/i18n';
import { escapeHtml } from '../../util/format';
import type { Language } from '../../types/enums';

export type EmailContent = {
  heading: string;
  paragraphs: string[];
  details?: { label: string; value: string }[];
  action?: { label: string; url: string };
};

export type RenderedEmail = { subject: string; html: string; text: string };

const BRAND = '#4f46e5';

function detailsHtml(details: EmailContent['details']) {
  if (!details?.length) return '';
  const rows = details
    .map(
      (d) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${escapeHtml(d.label)}</td><td style="padding:6px 0;color:#111827;font-weight:600">${escapeHtml(d.value)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" style="margin:16px 0;border-collapse:collapse;font-size:15px">${rows}</table>`;
}

function actionHtml(action: EmailContent['action'], lang: Language) {
  if (!action) return '';
  const button = `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(action.label)}</a></p>`;
  const fallback = `<p style="font-size:13px;color:#6b7280;word-break:break-all">${escapeHtml(t('email.layout.linkFallback', lang))} ${escapeHtml(action.url)}</p>`;
  return button + fallback;
}

export function renderLayout(subject: string, content: EmailContent, lang: Language): RenderedEmail {
  const paragraphs = content.paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join('');
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5">
<table role="presentation" width="100%" style="border-collapse:collapse;background:#f3f4f6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;border-collapse:collapse;background:#ffffff;border-radius:12px">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e5e7eb;font-size:22px;font-weight:700;color:${BRAND}">Tikly</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(content.heading)}</h1>
${paragraphs}${detailsHtml(content.details)}${actionHtml(content.action, lang)}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">${escapeHtml(t('email.layout.footer', lang))}</td></tr>
</table></td></tr></table>
</body>
</html>`;

  const text = [
    content.heading,
    '',
    ...content.paragraphs.flatMap((p) => [p, '']),
    ...(content.details ?? []).map((d) => `${d.label}: ${d.value}`),
    ...(content.action ? ['', `${content.action.label}: ${content.action.url}`] : []),
    '',
    '--',
    t('email.layout.footer', lang),
  ].join('\n');

  return { subject, html, text };
}
