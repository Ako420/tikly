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
  BOOKING_STATUSES,
  ROLES,
  SERVICE_CATEGORIES,
  SLOT_BOOKING_STATUSES,
  SERVICE_UNITS,
  TICKET_STATUSES,
  TIER_NAMES,
  TRANSACTION_STATUSES,
  USER_STATUSES,
  VERIFICATION_STATUSES,
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

export const Exhibitor = registry.register(
  'Exhibitor',
  z.object({
    name: z.string().openapi({ example: 'Kmer Crafts' }),
    slot: z.string().openapi({ example: 'Stand A' }),
    quantity: z.number().int().openapi({ example: 1 }),
  }),
);

export const EventDetail = registry.register(
  'EventDetail',
  Event.extend({
    tiers: z.array(Tier),
    agenda: z.array(AgendaItem),
    exhibitors: z.array(Exhibitor),
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

export const Ticket = registry.register(
  'Ticket',
  z.object({
    id: id(),
    code: z.string().openapi({ example: 'EVT-7K2M-9QX', description: 'Short code for manual lookup at the gate.' }),
    qrToken: z.string().openapi({
      example: '6743a1f2c9e77b0012ab34cd.AbCdEfGhIjKlMnOpQrStUv',
      description: 'Encode this string as the QR code. Signed; never contains personal data (SEC-2).',
    }),
    status: z.enum(TICKET_STATUSES),
    orderId: id(),
    checkIns: z.array(z.object({ at: dateTime(), type: z.enum(['entry', 'reentry']) })),
    tier: z.object({ id: id(), name: z.enum(TIER_NAMES), price: xaf(15000) }),
    event: z.object({
      id: id(),
      title: bilingual('Douala Jazz Night', 'Nuit du jazz de Douala'),
      startAt: dateTime(),
      endAt: dateTime('2026-12-20T21:00:00.000Z'),
      venue: z.string(),
      city: z.string(),
      coverUrl: z.string().optional(),
      status: z.enum(EVENT_STATUSES),
    }),
    refundable: z
      .boolean()
      .openapi({ description: 'True while the ticket is unused and the event starts in more than 48 hours.' }),
    createdAt: dateTime(),
  }),
);

export const TicketCancellation = registry.register(
  'TicketCancellation',
  z.object({
    ticket: Ticket,
    refund: z.object({ amount: xaf(7500).openapi({ description: '50% of the price paid; 0 for free tickets.' }) }),
  }),
);

export const PdfFile = z.string().openapi({ type: 'string', format: 'binary' });

const StaffEvent = z.object({
  id: id(),
  title: bilingual('Douala Jazz Night', 'Nuit du jazz de Douala'),
  startAt: dateTime(),
  endAt: dateTime('2026-12-20T21:00:00.000Z'),
  venue: z.string(),
  city: z.string(),
  status: z.enum(EVENT_STATUSES),
});

export const StaffMember = registry.register(
  'StaffMember',
  User.extend({ events: z.array(StaffEvent).openapi({ description: 'Events this staff member is assigned to.' }) }),
);

export const AssignedEvent = registry.register(
  'AssignedEvent',
  StaffEvent.extend({ today: z.boolean().openapi({ description: 'Happening within a day of now; listed first.' }) }),
);

export const Assignment = registry.register('Assignment', z.object({ staffId: id(), eventId: id() }));

export const GateTicket = registry.register(
  'GateTicket',
  z.object({
    id: id(),
    code: z.string().openapi({ example: 'EVT-7K2M-9QX' }),
    status: z.enum(TICKET_STATUSES),
    tier: z.enum(TIER_NAMES).nullable(),
    holderName: z.string().openapi({ example: 'Ama N.', description: 'First name and initial only.' }),
    checkIns: z.array(
      z.object({
        at: dateTime(),
        type: z.enum(['entry', 'reentry']),
        note: z.string().optional(),
        staffName: z.string().nullable().openapi({ example: 'Gate 1' }),
      }),
    ),
  }),
);

export const ScanOutcome = registry.register(
  'ScanOutcome',
  z.object({
    result: z.enum(['VALID', 'ALREADY_CHECKED_IN', 'INVALID', 'WRONG_EVENT', 'CANCELLED']).openapi({
      description:
        'VALID: first entry, now checked in (green). ALREADY_CHECKED_IN: show the earlier check-in time (orange). INVALID, WRONG_EVENT, CANCELLED: refuse (red). UI-4.',
    }),
    ticket: GateTicket.optional().openapi({ description: 'Missing for INVALID and WRONG_EVENT.' }),
  }),
);

export const CheckinCounts = registry.register(
  'CheckinCounts',
  z.object({
    tiers: z.array(
      z.object({
        id: id(),
        name: z.enum(TIER_NAMES),
        sold: z.number().int(),
        checkedIn: z.number().int(),
        reentries: z.number().int(),
      }),
    ),
    totals: z.object({ sold: z.number().int(), checkedIn: z.number().int(), reentries: z.number().int() }),
    lastCheckInAt: dateTime().nullable(),
    generatedAt: dateTime(),
  }),
);

export const ProviderProfile = registry.register(
  'ProviderProfile',
  z.object({
    id: id(),
    userId: id('6743a1f2c9e77b0012ab34ce'),
    businessName: z.string().openapi({ example: 'Akwa Events Hire' }),
    description: z.string().optional().openapi({ example: 'Chairs, canopies and sound for events in Douala.' }),
    city: z.string().openapi({ example: 'Douala' }),
    country: z.string().openapi({ example: 'Cameroon' }),
    phone: z.string().openapi({ example: '+237677123456' }),
    whatsapp: z.string().optional().openapi({ example: '+237690123456' }),
    documents: z.array(z.string()).openapi({
      example: ['documents/niu_scan_x81kq'],
      description: 'Private document ids from POST /uploads/document. Only admins can open them.',
    }),
    verification: z.enum(VERIFICATION_STATUSES).openapi({
      description: 'Services are listed only while `verified`.',
    }),
    rejectionReason: z.string().optional().openapi({ description: 'Set when `rejected`. Show it to the provider.' }),
    ratingAvg: z.number().openapi({ example: 4.6 }),
    ratingCount: z.number().int().openapi({ example: 18 }),
    ...timestamps,
  }),
);

const providerSummaryShape = {
  id: id(),
  businessName: z.string().openapi({ example: 'Akwa Events Hire' }),
  city: z.string().openapi({ example: 'Douala' }),
  ratingAvg: z.number().openapi({ example: 4.6 }),
  ratingCount: z.number().int().openapi({ example: 18 }),
};

export const ProviderSummary = registry.register('ProviderSummary', z.object(providerSummaryShape));

export const ProviderContact = registry.register(
  'ProviderContact',
  z.object({
    ...providerSummaryShape,
    description: z.string().optional(),
    country: z.string().openapi({ example: 'Cameroon' }),
    phone: z
      .string()
      .openapi({ example: '+237677123456', description: 'Call to book directly (directory mode, SRV-5).' }),
    whatsapp: z
      .string()
      .optional()
      .openapi({ example: '+237690123456', description: 'Open https://wa.me/<number without +>.' }),
  }),
);

export const ServiceItem = registry.register(
  'Service',
  z.object({
    id: id('6743a1f2c9e77b0012ab34d0'),
    providerId: id(),
    category: z.enum(SERVICE_CATEGORIES),
    title: bilingual('Canopy 5×10 m with setup', 'Bâche 5×10 m avec montage'),
    description: z.string().optional().openapi({ example: 'White canopy, delivered and set up the day before.' }),
    photos: z.array(z.string()).openapi({ example: ['https://res.cloudinary.com/demo/image/upload/services/c1.jpg'] }),
    city: z.string().openapi({ example: 'Douala' }),
    price: xaf(25000),
    unit: z.enum(SERVICE_UNITS).openapi({ description: 'What `price` covers: one day, one item or the whole event.' }),
    active: z.boolean().openapi({ description: 'False once deleted or switched off by an admin.' }),
    ...timestamps,
  }),
);

export const ServiceListItem = registry.register(
  'ServiceListItem',
  ServiceItem.extend({ provider: ProviderSummary.nullable() }),
);

export const ServiceDetail = registry.register('ServiceDetail', ServiceItem.extend({ provider: ProviderContact }));

export const PublicProvider = registry.register(
  'PublicProvider',
  ProviderContact.extend({ services: z.array(ServiceItem) }),
);

export const ProviderEarnings = registry.register(
  'ProviderEarnings',
  z.object({
    from: dateTime('2026-11-01T00:00:00.000Z').nullable(),
    to: dateTime('2026-11-30T23:59:59.000Z').nullable(),
    paidBookings: z.number().int().openapi({ example: 4 }),
    gross: xaf(400000).openapi({ description: 'What organizers paid.' }),
    commission: xaf(40000).openapi({ description: 'Tikly commission.' }),
    net: xaf(360000).openapi({ description: 'Your share.' }),
    refunded: xaf(0),
  }),
);

export const BookingView = registry.register(
  'Booking',
  z.object({
    id: id('6743a1f2c9e77b0012ab34d1'),
    status: z.enum(BOOKING_STATUSES).openapi({
      description:
        'requested → accepted (provider set the price) → paid → completed. Also declined (by the provider) or cancelled (by the organizer, before payment).',
    }),
    startDate: dateTime('2026-12-19T08:00:00.000Z'),
    endDate: dateTime('2026-12-20T23:00:00.000Z'),
    quantity: z.number().int().openapi({ example: 2 }),
    amount: xaf(50000).nullable().openapi({ description: 'Final price set by the provider on accept; null before.' }),
    note: z.string().optional().openapi({ example: 'Set up near the main stage, please.' }),
    declineReason: z.string().optional(),
    service: z
      .object({
        id: id('6743a1f2c9e77b0012ab34d0'),
        category: z.enum(SERVICE_CATEGORIES),
        title: bilingual('Canopy 5×10 m with setup', 'Bâche 5×10 m avec montage'),
        unit: z.enum(SERVICE_UNITS),
        price: xaf(25000).openapi({ description: 'The listed price, for reference.' }),
        photo: z.string().nullable(),
      })
      .nullable(),
    provider: z
      .object({
        id: id(),
        businessName: z.string().openapi({ example: 'Akwa Events Hire' }),
        phone: z.string().openapi({ example: '+237677123456' }),
        whatsapp: z.string().optional(),
      })
      .nullable(),
    organizer: z
      .object({
        id: id(),
        name: z.string().openapi({ example: 'Ama Ngono' }),
        phone: z.string().openapi({ example: '+237690000001' }),
      })
      .nullable(),
    event: z
      .object({
        id: id(),
        title: bilingual('Douala Jazz Night', 'Nuit du jazz de Douala'),
        startAt: dateTime(),
        city: z.string().openapi({ example: 'Douala' }),
      })
      .nullable(),
    payment: z
      .object({ orderId: id(), status: z.enum(ORDER_STATUSES) })
      .nullable()
      .openapi({ description: 'The latest payment attempt, if any.' }),
    ...timestamps,
  }),
);

export const SlotView = registry.register(
  'Slot',
  z.object({
    id: id('6743a1f2c9e77b0012ab34d2'),
    eventId: id(),
    label: z.string().openapi({ example: 'Stand A' }),
    size: z.string().optional().openapi({ example: '3 × 3 m, with a table' }),
    price: xaf(30000),
    quantity: z.number().int().openapi({ example: 10 }),
    available: z.number().int().openapi({ example: 4, description: 'quantity − booked − reserved.' }),
  }),
);

export const OwnerSlot = registry.register(
  'OwnerSlot',
  SlotView.extend({
    booked: z.number().int().openapi({ example: 5 }),
    reserved: z.number().int().openapi({ example: 1, description: 'Held by orders waiting for payment.' }),
  }),
);

export const ExhibitorEvent = registry.register(
  'ExhibitorEvent',
  Event.extend({
    slotsAvailable: z.number().int().openapi({ example: 6 }),
    slotPriceFrom: xaf(30000).nullable().openapi({ description: 'Cheapest slot type that still has room.' }),
  }),
);

export const SlotBookingView = registry.register(
  'SlotBooking',
  z.object({
    id: id(),
    status: z.enum(SLOT_BOOKING_STATUSES),
    quantity: z.number().int().openapi({ example: 1 }),
    orderId: id(),
    slot: z.object({ id: id(), label: z.string(), size: z.string().optional(), price: xaf(30000) }).nullable(),
    event: z
      .object({
        id: id(),
        title: bilingual('Douala Jazz Night', 'Nuit du jazz de Douala'),
        startAt: dateTime(),
        venue: z.string(),
        city: z.string(),
      })
      .nullable(),
    exhibitor: z
      .object({
        id: id(),
        name: z.string().openapi({ example: 'Kmer Crafts' }),
        email: z.string().optional(),
        phone: z.string().openapi({ example: '+237690000002' }),
      })
      .nullable(),
    createdAt: dateTime(),
  }),
);
