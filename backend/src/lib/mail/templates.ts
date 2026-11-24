import { env } from '../../config/env';
import { PASSWORD_RESET_MINUTES } from '../../config/constants';
import type { Language, Role, TierName } from '../../types/enums';
import { formatDateTime, formatXaf } from '../../util/format';
import { t } from '../../util/i18n';
import { renderLayout, type RenderedEmail } from './layout';

type EventSummary = { name: string; eventTitle: string; startAt: Date | string; venue: string; city: string; ticketsUrl?: string };

export type TemplateData = {
  account_welcome: { name: string; role: Role };
  password_reset: { name: string; resetUrl: string };
  ticket_purchased: EventSummary & { tickets: { code: string; tier: TierName }[]; amount: number };
  reminder_24h: EventSummary & { ticketCount: number };
};

export type MailTemplate = keyof TemplateData;

const ticketsUrl = (data: EventSummary) => data.ticketsUrl ?? `${env.APP_WEB_URL}/tickets`;

const ticketCount = (count: number, lang: Language) =>
  t(count === 1 ? 'email.common.ticketsOne' : 'email.common.ticketsMany', lang, { count });

const eventDetails = (data: EventSummary, lang: Language) => [
  { label: t('email.common.event', lang), value: data.eventTitle },
  { label: t('email.common.when', lang), value: formatDateTime(data.startAt, lang) },
  { label: t('email.common.where', lang), value: `${data.venue}, ${data.city}` },
];

const templates: { [K in MailTemplate]: (data: TemplateData[K], lang: Language) => RenderedEmail } = {
  account_welcome: (data, lang) =>
    renderLayout(
      t('email.account_welcome.subject', lang),
      {
        heading: t('email.account_welcome.heading', lang, { name: data.name }),
        paragraphs: [
          t('email.account_welcome.intro', lang, { role: t(`email.roles.${data.role}`, lang) }),
          t(`email.account_welcome.next.${data.role}`, lang),
        ],
        action: { label: t('email.account_welcome.action', lang), url: env.APP_WEB_URL },
      },
      lang,
    ),

  password_reset: (data, lang) =>
    renderLayout(
      t('email.password_reset.subject', lang),
      {
        heading: t('email.password_reset.heading', lang, { name: data.name }),
        paragraphs: [
          t('email.password_reset.intro', lang),
          t('email.password_reset.expiry', lang, { minutes: PASSWORD_RESET_MINUTES }),
          t('email.password_reset.ignore', lang),
        ],
        action: { label: t('email.password_reset.action', lang), url: data.resetUrl },
      },
      lang,
    ),

  ticket_purchased: (data, lang) =>
    renderLayout(
      t('email.ticket_purchased.subject', lang, { event: data.eventTitle }),
      {
        heading: t('email.ticket_purchased.heading', lang, { name: data.name }),
        paragraphs: [
          t('email.ticket_purchased.intro', lang, { tickets: ticketCount(data.tickets.length, lang), event: data.eventTitle }),
          t('email.ticket_purchased.attachment', lang),
        ],
        details: [
          ...eventDetails(data, lang),
          ...data.tickets.map((ticket) => ({ label: t(`email.tiers.${ticket.tier}`, lang), value: ticket.code })),
          { label: t('email.common.total', lang), value: formatXaf(data.amount) },
        ],
        action: { label: t('email.common.viewTickets', lang), url: ticketsUrl(data) },
      },
      lang,
    ),

  reminder_24h: (data, lang) =>
    renderLayout(
      t('email.reminder_24h.subject', lang, { event: data.eventTitle }),
      {
        heading: t('email.reminder_24h.heading', lang, { name: data.name }),
        paragraphs: [
          t('email.reminder_24h.intro', lang, { event: data.eventTitle, tickets: ticketCount(data.ticketCount, lang) }),
          t('email.reminder_24h.tip', lang),
        ],
        details: eventDetails(data, lang),
        action: { label: t('email.common.viewTickets', lang), url: ticketsUrl(data) },
      },
      lang,
    ),
};

export function renderEmail<K extends MailTemplate>(template: K, lang: Language, data: TemplateData[K]): RenderedEmail {
  return templates[template](data, lang);
}
