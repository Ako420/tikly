import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env';
import { sendMail, verifyMailer } from '../../src/lib/mailer';
import { PDF } from '../fixtures/files';

const inTwentyFourHours = new Date(Date.now() + 24 * 60 * 60 * 1000);
const event = {
  name: 'Tikly test',
  eventTitle: 'Douala Jazz Night (test)',
  startAt: inTwentyFourHours,
  venue: 'Salle des fêtes',
  city: 'Douala',
};

describe('SMTP account (live)', () => {
  it('logs in with the credentials in .env', async () => {
    await expect(verifyMailer()).resolves.toBe(true);
  });

  it('sends the welcome email in English to SMTP_USER', async () => {
    const result = await sendMail({ to: env.SMTP_USER, template: 'account_welcome', lang: 'en', data: { name: 'Tikly test', role: 'organizer' } });
    expect(result.messageId).toBeTruthy();
  });

  it('sends the ticket email in French with a PDF attached to SMTP_USER', async () => {
    const result = await sendMail({
      to: env.SMTP_USER,
      template: 'ticket_purchased',
      lang: 'fr',
      data: { ...event, amount: 15000, tickets: [{ code: 'TEST-0001', tier: 'vip' }] },
      attachments: [{ filename: 'TEST-0001.pdf', content: PDF, contentType: 'application/pdf' }],
    });
    expect(result.messageId).toBeTruthy();
  });

  it('sends the 24-hour reminder in English to SMTP_USER', async () => {
    const result = await sendMail({ to: env.SMTP_USER, template: 'reminder_24h', lang: 'en', data: { ...event, ticketCount: 2 } });
    expect(result.messageId).toBeTruthy();
  });
});
