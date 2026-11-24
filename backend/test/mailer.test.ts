import nodemailer from 'nodemailer';
import { describe, expect, it } from 'vitest';
import { sendMail, setMailTransport } from '../src/lib/mailer';
import { renderEmail, type MailTemplate, type TemplateData } from '../src/lib/mail/templates';
import { LANGUAGES, ROLES } from '../src/types/enums';
import { AppError } from '../src/util/AppError';
import { escapeHtml, formatDateTime, formatXaf } from '../src/util/format';
import { PDF } from './fixtures/files';

const NBSP = ' ';
const event = {
  name: 'Ama',
  eventTitle: 'Douala Jazz Night',
  startAt: '2026-12-20T17:00:00.000Z',
  venue: 'Salle des fêtes',
  city: 'Douala',
};
const samples: { [K in MailTemplate]: TemplateData[K] } = {
  account_welcome: { name: 'Ama', role: 'attendee' },
  password_reset: { name: 'Ama', resetUrl: 'https://tikly.test/reset-password?token=abc123' },
  ticket_purchased: { ...event, amount: 30000, tickets: [{ code: 'EVT-7K2M-9Q', tier: 'vip' }, { code: 'EVT-8P3D-2R', tier: 'vip' }] },
  reminder_24h: { ...event, ticketCount: 1 },
};
const templates = Object.keys(samples) as MailTemplate[];

describe('formatting', () => {
  it('shows money as whole XAF with grouped thousands (UI-5)', () => {
    expect(formatXaf(12500)).toBe(`12${NBSP}500${NBSP}XAF`);
    expect(formatXaf(1250000)).toBe(`1${NBSP}250${NBSP}000${NBSP}XAF`);
    expect(formatXaf(0)).toBe(`0${NBSP}XAF`);
  });

  it('shows dates in the reader’s language, in Central Africa time', () => {
    expect(formatDateTime('2026-12-20T17:00:00.000Z', 'en')).toMatch(/Sunday.*20 December 2026.*18:00/);
    expect(formatDateTime('2026-12-20T17:00:00.000Z', 'fr')).toMatch(/dimanche 20 décembre 2026.*18:00/);
  });

  it('escapes HTML', () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe('&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;');
  });
});

describe.each(templates)('%s template', (template) => {
  it.each(LANGUAGES)('renders completely in %s', (lang) => {
    const email = renderEmail(template, lang, samples[template] as never);
    for (const part of [email.subject, email.html, email.text]) {
      expect(part).not.toMatch(/\{\w+\}/);
      expect(part).not.toMatch(/\bemail\.[a-z_]+\./);
    }
    expect(email.html).toContain(`<html lang="${lang}">`);
    expect(email.text.length).toBeGreaterThan(50);
  });

  it('is different in English and French', () => {
    const en = renderEmail(template, 'en', samples[template] as never);
    const fr = renderEmail(template, 'fr', samples[template] as never);
    expect(fr.subject).not.toBe(en.subject);
  });
});

describe('template content', () => {
  it('tells each role what to do next', () => {
    const texts = ROLES.map((role) => renderEmail('account_welcome', 'en', { name: 'Ama', role }).text);
    expect(new Set(texts).size).toBe(ROLES.length);
    expect(renderEmail('account_welcome', 'en', { name: 'Ama', role: 'provider' }).text).toContain('verifies your business');
  });

  it('puts the reset link and the 60-minute expiry in the password email', () => {
    const email = renderEmail('password_reset', 'fr', samples.password_reset);
    expect(email.html).toContain('href="https://tikly.test/reset-password?token=abc123"');
    expect(email.text).toContain('60 minutes');
  });

  it('lists each ticket, the total and the event time in the purchase email', () => {
    const email = renderEmail('ticket_purchased', 'en', samples.ticket_purchased);
    expect(email.subject).toBe('Your tickets for Douala Jazz Night');
    expect(email.text).toContain('2 tickets');
    expect(email.text).toContain('VIP ticket: EVT-7K2M-9Q');
    expect(email.text).toContain(`Total paid: 30${NBSP}000${NBSP}XAF`);
    expect(email.text).toContain('18:00');
    expect(email.html).toContain('href="https://tikly.test/tickets"');
  });

  it('uses the singular for one ticket in the reminder', () => {
    expect(renderEmail('reminder_24h', 'en', samples.reminder_24h).text).toContain('You have 1 ticket.');
    expect(renderEmail('reminder_24h', 'fr', samples.reminder_24h).text).toContain('Vous avez 1 billet.');
  });

  it('escapes names and titles so they cannot inject HTML', () => {
    const email = renderEmail('ticket_purchased', 'en', {
      ...samples.ticket_purchased,
      name: '<script>alert(1)</script>',
      eventTitle: 'Rock & <b>Roll</b>',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('Rock &amp; &lt;b&gt;Roll&lt;/b&gt;');
  });
});

describe('sendMail', () => {
  it('sends from MAIL_FROM with HTML, text and attachments', async () => {
    const sent: { message?: string } = {};
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const original = transport.sendMail.bind(transport);
    transport.sendMail = (async (mail: Parameters<typeof original>[0]) => {
      const info = await original(mail);
      sent.message = info.message as unknown as string;
      return info;
    }) as typeof transport.sendMail;
    setMailTransport(transport);

    const result = await sendMail({
      to: 'ama@example.cm',
      template: 'ticket_purchased',
      lang: 'fr',
      data: samples.ticket_purchased,
      attachments: [{ filename: 'EVT-7K2M-9Q.pdf', content: PDF, contentType: 'application/pdf' }],
    });

    expect(result.messageId).toBeTruthy();
    const message = JSON.parse(sent.message!);
    expect(message.from).toEqual({ address: 'tests@tikly.test', name: 'Tikly' });
    expect(message.to).toEqual([{ address: 'ama@example.cm', name: '' }]);
    expect(message.subject).toBe('Vos billets pour Douala Jazz Night');
    expect(message.html).toContain('<html lang="fr">');
    expect(message.text).toContain('Total payé');
    expect(message.attachments).toEqual([
      expect.objectContaining({ filename: 'EVT-7K2M-9Q.pdf', contentType: 'application/pdf' }),
    ]);
  });

  it('turns an SMTP failure into 502 MAIL_FAILED', async () => {
    setMailTransport(
      nodemailer.createTransport({
        name: 'failing',
        version: '1',
        send: (_mail, done) => done(Object.assign(new Error('535 5.7.8 Username and Password not accepted'), { responseCode: 535 }), undefined as never),
      }),
    );
    const failure = await sendMail({ to: 'ama@example.cm', template: 'account_welcome', lang: 'en', data: samples.account_welcome }).catch(
      (err: unknown) => err,
    );
    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({ statusCode: 502, code: 'MAIL_FAILED' });
  });
});
