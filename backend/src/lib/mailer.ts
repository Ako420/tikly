import nodemailer, { type Transporter } from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';
import { env } from '../config/env';
import type { Language } from '../types/enums';
import { AppError } from '../util/AppError';
import { logger } from './logger';
import { renderEmail, type MailTemplate, type TemplateData } from './mail/templates';

export type { MailTemplate, TemplateData } from './mail/templates';

function createSmtpTransport(): Transporter {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
}

let transport: Transporter = createSmtpTransport();

export function setMailTransport(next: Transporter) {
  transport = next;
}

export function verifyMailer() {
  return transport.verify();
}

type SendMailInput<K extends MailTemplate> = {
  to: string;
  template: K;
  lang: Language;
  data: TemplateData[K];
  attachments?: Attachment[];
};

export async function sendMail<K extends MailTemplate>({ to, template, lang, data, attachments }: SendMailInput<K>) {
  const email = renderEmail(template, lang, data);
  try {
    const info = await transport.sendMail({
      from: env.MAIL_FROM,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments,
    });
    logger.info({ template, lang, messageId: info.messageId }, 'Email sent');
    return { messageId: String(info.messageId) };
  } catch (err) {
    logger.error({ err, template, lang }, 'Email failed');
    throw new AppError(502, 'MAIL_FAILED');
  }
}
