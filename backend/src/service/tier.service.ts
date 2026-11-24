import type { Types } from 'mongoose';
import { EventModel, TicketTierModel, type EventDoc, type TicketTierDoc } from '../model';
import type { CreateTierBody, UpdateTierBody } from '../schema/tier.schema';
import type { EventStatus, Role } from '../types/enums';
import { AppError } from '../util/AppError';

export type TierLike = {
  _id: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  reserved: number;
  salesEndAt: Date;
};

type Viewer = { id: string; role: Role } | undefined;

const PUBLIC_STATUSES: EventStatus[] = ['published', 'completed'];
const TIER_SETUP_STATUSES: EventStatus[] = ['draft', 'rejected'];
const CLOSED_STATUSES: EventStatus[] = ['cancelled', 'completed', 'suspended'];

export const available = (tier: TierLike) => Math.max(0, tier.quantity - tier.sold - tier.reserved);

export function toTierView(tier: TierLike, now = new Date()) {
  const left = available(tier);
  return {
    id: String(tier._id),
    name: tier.name,
    price: tier.price,
    quantity: tier.quantity,
    available: left,
    salesEndAt: tier.salesEndAt,
    onSale: left > 0 && tier.salesEndAt > now,
  };
}

const toOwnerView = (tier: TierLike, now = new Date()) => ({
  ...toTierView(tier, now),
  sold: tier.sold,
  reserved: tier.reserved,
});

function assertSalesEndBeforeStart(salesEndAt: Date, event: EventDoc) {
  if (salesEndAt > event.startAt) throw AppError.badRequest('SALES_END_AFTER_EVENT_START', { startAt: event.startAt });
}

export async function listTiers(eventId: string, viewer: Viewer) {
  const event = await EventModel.findById(eventId);
  if (!event) throw AppError.notFound();
  const isOwner = viewer?.role === 'admin' || (viewer !== undefined && String(event.organizerId) === viewer.id);
  if (!isOwner && !PUBLIC_STATUSES.includes(event.status as EventStatus)) throw AppError.notFound();
  const tiers = await TicketTierModel.find({ eventId: event._id }).sort({ price: 1 }).lean();
  const now = new Date();
  return tiers.map((tier) => (isOwner ? toOwnerView(tier, now) : toTierView(tier, now)));
}

export async function createTier(event: EventDoc, input: CreateTierBody) {
  if (!TIER_SETUP_STATUSES.includes(event.status as EventStatus)) throw AppError.conflict('EVENT_NOT_EDITABLE');
  assertSalesEndBeforeStart(input.salesEndAt, event);
  const tier = await TicketTierModel.create({ ...input, eventId: event._id });
  return toOwnerView(tier);
}

export async function updateTier(tier: TicketTierDoc, event: EventDoc, input: UpdateTierBody) {
  if (CLOSED_STATUSES.includes(event.status as EventStatus)) throw AppError.conflict('EVENT_NOT_EDITABLE');
  if (input.salesEndAt) assertSalesEndBeforeStart(input.salesEndAt, event);

  const filter: Record<string, unknown> = { _id: tier._id };
  if (input.price !== undefined && input.price !== tier.price) filter.sold = 0;
  if (input.quantity !== undefined) {
    filter.$expr = { $lte: [{ $add: ['$sold', '$reserved'] }, input.quantity] };
  }

  const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
  const updated = await TicketTierModel.findOneAndUpdate(filter, { $set: changes }, { new: true });
  if (updated) return toOwnerView(updated);

  const current = await TicketTierModel.findById(tier._id);
  if (!current) throw AppError.notFound();
  if (input.price !== undefined && input.price !== current.price && current.sold > 0) {
    throw AppError.conflict('TIER_PRICE_LOCKED', { sold: current.sold });
  }
  throw AppError.conflict('TIER_QUANTITY_BELOW_SOLD', { minimum: current.sold + current.reserved });
}

export async function deleteTier(tier: TicketTierDoc) {
  const { deletedCount } = await TicketTierModel.deleteOne({ _id: tier._id, sold: 0, reserved: 0 });
  if (deletedCount === 0) throw AppError.conflict('TIER_IN_USE');
}
