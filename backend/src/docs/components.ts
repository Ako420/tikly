import { z } from 'zod';
import {
  BUDGET_SOURCES,
  EVENT_STATUSES,
  GUEST_SOURCES,
  LANGUAGES,
  ORDER_ITEM_MODELS,
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_PROVIDERS,
  ROLES,
  TICKET_STATUSES,
  TIER_NAMES,
  TRANSACTION_STATUSES,
  USER_STATUSES,
} from '../types/enums';
import { registry } from './registry';

const id = (example = '6743a1f2c9e77b0012ab34cd') => z.string().openapi({ example });
const dateTime = (example = '2026-12-20T17:00:00.000Z') => z.iso.datetime().openapi({ example });
const xaf = (example: number) =>
  z.number().int().openapi({ example, description: 'Whole francs CFA (XAF), never decimals.' });
const timestamps = { createdAt: dateTime(), updatedAt: dateTime() };
const bilingual = (en: string, fr: string) =>
  z
    .object({ en: z.string().optional(), fr: z.string().optional() })
    .openapi({ example: { en, fr }, description: 'At least one language is set.' });

export const User = registry.register(
  'User',
  z.object({
    id: id(),
    name: z.string().openapi({ example: 'Ama Ngono' }),
    email: z.string().optional().openapi({ example: 'ama@example.cm', description: 'Missing for gate staff.' }),
    phone: z.string().openapi({ example: '+237677123456', description: 'Always stored as +2376XXXXXXXX.' }),
    role: z.enum(ROLES),
    language: z.enum(LANGUAGES),
    status: z.enum(USER_STATUSES),
    organizerId: id().optional().openapi({ description: 'Only for gate staff: the organizer who created them.' }),
    pushTokens: z.array(z.string()).openapi({ example: ['ExponentPushToken[abc123]'] }),
    ...timestamps,
  }),
);

export const Tokens = registry.register(
  'Tokens',
  z.object({
    accessToken: z.string().openapi({ description: 'Send as `Authorization: Bearer <token>`. Lives 15 minutes.' }),
    refreshToken: z
      .string()
      .openapi({ description: 'Lives 7 days. Exchange at /auth/refresh; each use returns a new one.' }),
    expiresIn: z.number().int().openapi({ example: 900, description: 'Access token lifetime in seconds.' }),
  }),
);

export const Session = registry.register('Session', z.object({ user: User, tokens: Tokens }));

export const GoogleSession = registry.register(
  'GoogleSession',
  z.object({ user: User, tokens: Tokens, isNewUser: z.boolean() }),
);

export const RefreshedTokens = registry.register('RefreshedTokens', z.object({ tokens: Tokens }));

export const ImageUpload = registry.register(
  'ImageUpload',
  z.object({
    url: z.string().openapi({ example: 'https://res.cloudinary.com/demo/image/upload/events/abc.png' }),
    publicId: z.string().openapi({ example: 'events/abc' }),
  }),
);

export const DocumentUpload = registry.register(
  'DocumentUpload',
  z.object({
    publicId: z.string().openapi({
      example: 'documents/xyz',
      description: 'Private. Send it in the provider profile; admins open it through a signed link.',
    }),
  }),
);

export const FileUpload = z.object({
  file: z.string().openapi({ type: 'string', format: 'binary', description: 'The file, in a field named `file`.' }),
});

export const Event = registry.register(
  'Event',
  z.object({
    id: id(),
    organizerId: id(),
    title: bilingual('Douala Jazz Night', 'Nuit du jazz de Douala'),
    description: bilingual('Live jazz by the river.', 'Jazz en direct au bord du fleuve.'),
    category: z.string().openapi({ example: 'concert', description: 'A key from GET /categories.' }),
    coverUrl: z.string().optional().openapi({ example: 'https://res.cloudinary.com/demo/image/upload/events/abc.png' }),
    venue: z.string().openapi({ example: 'Salle des fêtes' }),
    city: z.string().openapi({ example: 'Douala' }),
    country: z.string().openapi({ example: 'Cameroon' }),
    startAt: dateTime(),
    endAt: dateTime('2026-12-20T21:00:00.000Z'),
    status: z.enum(EVENT_STATUSES),
    rejectionReason: z.string().optional(),
    cancellationReason: z.string().optional(),
    ratingAvg: z.number().openapi({ example: 4.5 }),
    ratingCount: z.number().int().openapi({ example: 12 }),
    ...timestamps,
  }),
);

export const EventListItem = registry.register(
  'EventListItem',
  Event.extend({
    priceFrom: xaf(5000).nullable().openapi({ description: 'Lowest tier price, or null when no tier exists.' }),
  }),
);

export const Tier = registry.register(
  'Tier',
  z.object({
    id: id(),
    name: z.enum(TIER_NAMES),
    price: xaf(15000),
    quantity: z.number().int().openapi({ example: 100 }),
    available: z.number().int().openapi({ example: 42, description: 'quantity − sold − reserved.' }),
    salesEndAt: dateTime('2026-12-19T23:00:00.000Z'),
    onSale: z.boolean().openapi({ description: 'Tickets left and sales still open.' }),
  }),
);

export const OwnerTier = registry.register(
  'OwnerTier',
  Tier.extend({
    sold: z.number().int().openapi({ example: 50 }),
    reserved: z.number().int().openapi({ example: 8, description: 'Held by orders waiting for payment.' }),
  }),
);

export const AgendaItem = registry.register(
  'AgendaItem',
  z.object({
    id: id(),
    eventId: id(),
    title: z.string().openapi({ example: 'Headliner' }),
    startAt: dateTime(),
    endAt: dateTime('2026-12-20T18:00:00.000Z'),
    speaker: z.string().optional(),
    location: z.string().optional(),
    ...timestamps,
  }),
);

export const EventDetail = registry.register(
  'EventDetail',
  Event.extend({
    tiers: z.array(Tier),
    agenda: z.array(AgendaItem),
    exhibitors: z.array(
      z.object({
        name: z.string().openapi({ example: 'Kmer Crafts' }),
        slot: z.string().openapi({ example: 'Stand A' }),
        quantity: z.number().int(),
      }),
    ),
  }),
);

export const EventStats = registry.register(
  'EventStats',
  z.object({
    tiers: z.array(OwnerTier.extend({ checkedIn: z.number().int() })),
    totals: z.object({
      ticketsSold: z.number().int(),
      checkedIn: z.number().int(),
      gross: xaf(300000),
      commission: xaf(30000),
      net: xaf(270000).openapi({ description: 'Organizer share of successful payments.' }),
      refunded: xaf(0),
    }),
  }),
);

export const ShareLinks = registry.register(
  'ShareLinks',
  z.object({
    url: z.string().openapi({ example: 'https://tikly.app/events/6743a1f2c9e77b0012ab34cd' }),
    whatsapp: z
      .string()
      .openapi({ example: 'https://wa.me/?text=Douala%20Jazz%20Night%20https%3A%2F%2Ftikly.app%2F…' }),
    facebook: z
      .string()
      .openapi({ example: 'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Ftikly.app%2F…' }),
  }),
);

export const Category = registry.register(
  'Category',
  z.object({
    key: z.string().openapi({ example: 'conference' }),
    en: z.string().openapi({ example: 'Conference' }),
    fr: z.string().openapi({ example: 'Conférence' }),
  }),
);

export const BudgetItem = registry.register(
  'BudgetItem',
  z.object({
    id: id(),
    eventId: id(),
    label: z.string().openapi({ example: 'Hall rental' }),
    category: z.string().openapi({ example: 'venue' }),
    planned: xaf(300000),
    actual: xaf(280000),
    source: z.enum(BUDGET_SOURCES),
    bookingId: id().optional(),
    ...timestamps,
  }),
);

export const Budget = registry.register(
  'Budget',
  z.object({
    items: z.array(BudgetItem),
    totals: z.object({
      planned: xaf(400000),
      actual: xaf(380000),
      income: z.object({ tickets: xaf(270000), slots: xaf(60000) }),
      balance: xaf(-50000).openapi({ description: 'income.tickets + income.slots − actual.' }),
    }),
  }),
);

export const ChecklistItem = registry.register(
  'ChecklistItem',
  z.object({
    id: id(),
    eventId: id(),
    title: z.string().openapi({ example: 'Book the hall' }),
    dueAt: dateTime().optional(),
    done: z.boolean(),
    ...timestamps,
  }),
);

export const Checklist = registry.register(
  'Checklist',
  z.object({
    items: z.array(ChecklistItem),
    progress: z.number().int().openapi({ example: 33, description: 'Percent of tasks done, 0–100.' }),
  }),
);

export const Guest = registry.register(
  'Guest',
  z.object({
    id: id(),
    eventId: id(),
    name: z.string().openapi({ example: 'Bello Speaker' }),
    phone: z.string().optional().openapi({ example: '+237699112233' }),
    email: z.string().optional(),
    category: z.string().openapi({ example: 'vip' }),
    source: z.enum(GUEST_SOURCES),
    ...timestamps,
  }),
);

export const ImportResult = registry.register(
  'ImportResult',
  z.object({ imported: z.number().int(), skipped: z.number().int() }),
);

export const Health = registry.register(
  'Health',
  z.object({ status: z.literal('ok'), db: z.literal('up'), time: dateTime() }),
);

export const Empty = z.null().openapi({ description: 'No data.' });

export const Order = registry.register(
  'Order',
  z.object({
    id: id(),
    type: z.enum(ORDER_TYPES),
    status: z.enum(ORDER_STATUSES).openapi({
      description:
        '`pending` until the payment settles, then `paid`. `failed` when declined, `expired` when unpaid after 10 minutes (stock released), `refunded` when money went back.',
    }),
    buyerId: id(),
    payeeId: id(),
    eventId: id().optional(),
    items: z.array(
      z.object({
        refId: id(),
        refModel: z.enum(ORDER_ITEM_MODELS),
        quantity: z.number().int().openapi({ example: 2 }),
        unitPrice: xaf(15000),
      }),
    ),
    amount: xaf(30000),
    phone: z.string().optional().openapi({ example: '+237670000000' }),
    expiresAt: dateTime('2026-11-24T10:20:00.000Z').optional(),
    paidAt: dateTime().optional(),
    event: z
      .object({
        id: id(),
        title: bilingual('Douala Jazz Night', 'Nuit du jazz de Douala'),
        startAt: dateTime(),
        venue: z.string(),
        city: z.string(),
      })
      .nullable(),
    payment: z
      .object({
        provider: z.enum(PAYMENT_PROVIDERS),
        externalRef: z.string().openapi({ example: 'aBcD1234' }),
        status: z.enum(TRANSACTION_STATUSES),
        message: z.string().nullable().openapi({
          example: 'Confirm the payment on your phone.',
          description: 'Shown while pending, in the user’s language.',
        }),
      })
      .nullable()
      .openapi({ description: 'Null for free orders.' }),
    tickets: z
      .array(
        z.object({
          id: id(),
          code: z.string().openapi({ example: 'EVT-7K2M-9QX' }),
          tierId: id(),
          status: z.enum(TICKET_STATUSES),
        }),
      )
      .openapi({ description: 'Filled once a ticket order is paid.' }),
    ...timestamps,
  }),
);

export const WebhookAck = z.object({ received: z.literal(true) });
