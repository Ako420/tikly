import { Types } from 'mongoose';
import { EventModel, TicketTierModel, UserModel } from '../../src/model';
import type { Language, Role, UserStatus } from '../../src/types/enums';
import { signAccessToken } from '../../src/util/jwt';

let counter = 0;
const next = () => (counter += 1);

export const DAY = 24 * 60 * 60 * 1000;
export const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

type UserOptions = { status?: UserStatus; language?: Language; organizerId?: Types.ObjectId; name?: string };

function insertUser(role: Role, options: UserOptions) {
  const n = next();
  return UserModel.create({
    name: options.name ?? `${role} ${n}`,
    ...(role !== 'staff' && { email: `${role}${n}@example.cm` }),
    phone: `+2376${String(n).padStart(8, '0')}`,
    role,
    status: options.status ?? 'active',
    language: options.language ?? 'en',
    passwordHash: 'not-used',
    ...(options.organizerId && { organizerId: options.organizerId }),
  });
}

export async function createUser(role: Role, options: UserOptions = {}) {
  const organizerId = role === 'staff' ? (options.organizerId ?? (await insertUser('organizer', {}))._id) : undefined;
  const user = await insertUser(role, { ...options, organizerId });
  const token = signAccessToken({ sub: user.id, role, lang: user.language as Language });
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

export const eventInput = (overrides: Record<string, unknown> = {}) => ({
  title: { en: 'Douala Jazz Night', fr: 'Nuit du jazz de Douala' },
  description: { en: 'Live jazz by the river.', fr: 'Jazz en direct au bord du fleuve.' },
  category: 'concert',
  venue: 'Salle des fêtes',
  city: 'Douala',
  country: 'Cameroon',
  startAt: daysFromNow(30),
  endAt: new Date(daysFromNow(30).getTime() + 4 * 60 * 60 * 1000),
  ...overrides,
});

export async function createEvent(organizerId: Types.ObjectId | string, overrides: Record<string, unknown> = {}) {
  return EventModel.create({ ...eventInput(), organizerId, status: 'draft', ...overrides });
}

export async function createTier(eventId: Types.ObjectId | string, overrides: Record<string, unknown> = {}) {
  return TicketTierModel.create({
    eventId,
    name: 'standard',
    price: 5000,
    quantity: 100,
    salesEndAt: daysFromNow(29),
    ...overrides,
  });
}

export const objectId = () => new Types.ObjectId();
