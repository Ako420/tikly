import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import {
  BookingModel,
  EventModel,
  OrderModel,
  ReviewModel,
  ServiceModel,
  SettingModel,
  TicketTierModel,
  TransactionModel,
  UserModel,
} from '../src/model';

const id = () => new Types.ObjectId();

async function errorsOf(doc: { validate: () => Promise<void> }) {
  const error = await doc.validate().then(
    () => undefined,
    (err: { errors: Record<string, { message: string }> }) => err,
  );
  return Object.fromEntries(Object.entries(error?.errors ?? {}).map(([path, e]) => [path, e.message]));
}

const validEvent = () => ({
  organizerId: id(),
  title: { en: 'Douala Jazz Night' },
  description: { fr: 'Une soirée de jazz' },
  category: 'music',
  venue: 'Salle des fêtes',
  city: 'Douala',
  country: 'Cameroon',
  startAt: new Date('2026-12-20T18:00:00Z'),
  endAt: new Date('2026-12-20T23:00:00Z'),
});

describe('UserModel', () => {
  it('requires an email for every role except staff', async () => {
    const errors = await errorsOf(new UserModel({ name: 'Ama', phone: '677000000', passwordHash: 'x', role: 'attendee' }));
    expect(errors.email).toBe('validation.user.email.required');
  });

  it('requires gate staff to belong to an organizer', async () => {
    const errors = await errorsOf(new UserModel({ name: 'Gate 1', phone: '677000001', passwordHash: 'x', role: 'staff' }));
    expect(errors.email).toBeUndefined();
    expect(errors.organizerId).toBe('validation.user.organizerId.required');
  });

  it('rejects bad names, emails, phones and roles with specific messages', async () => {
    const errors = await errorsOf(
      new UserModel({ name: 'A', email: 'nope', phone: '12345', passwordHash: 'x', role: 'superuser' }),
    );
    expect(errors).toMatchObject({
      name: 'validation.user.name.minLength',
      email: 'validation.user.email.invalid',
      phone: 'validation.user.phone.invalid',
      role: 'validation.user.role.invalid',
    });
  });

  it('hides secrets and exposes id in JSON', () => {
    const user = new UserModel({ name: 'Ama', email: 'ama@example.com', phone: '677000000', passwordHash: 'secret', role: 'attendee' });
    const json = user.toJSON() as Record<string, unknown>;
    expect(json.id).toBe(String(user._id));
    expect(json).not.toHaveProperty('_id');
    expect(json).not.toHaveProperty('passwordHash');
    expect(json).not.toHaveProperty('__v');
  });
});

describe('EventModel', () => {
  it('accepts a valid event with text in only one language', async () => {
    expect(await errorsOf(new EventModel(validEvent()))).toEqual({});
  });

  it('needs a title in at least one language', async () => {
    const errors = await errorsOf(new EventModel({ ...validEvent(), title: { en: '  ', fr: '' } }));
    expect(errors.title).toBe('validation.event.title.required');
  });

  it('must end after it starts', async () => {
    const errors = await errorsOf(new EventModel({ ...validEvent(), endAt: new Date('2026-12-20T17:00:00Z') }));
    expect(errors.endAt).toBe('validation.event.endAt.afterStart');
  });

  it('needs a reason when rejected', async () => {
    const errors = await errorsOf(new EventModel({ ...validEvent(), status: 'rejected' }));
    expect(errors.rejectionReason).toBe('validation.event.rejectionReason.required');
  });
});

describe('TicketTierModel', () => {
  it('rejects decimal prices and quantity below sold + reserved', async () => {
    const errors = await errorsOf(
      new TicketTierModel({ eventId: id(), name: 'vip', price: 1500.5, quantity: 5, sold: 4, reserved: 2, salesEndAt: new Date() }),
    );
    expect(errors.price).toBe('validation.common.amount.integer');
    expect(errors.quantity).toBe('validation.ticketTier.quantity.belowSold');
  });
});

describe('OrderModel', () => {
  it('caps ticket orders at 10 seats and needs a phone for paid orders', async () => {
    const errors = await errorsOf(
      new OrderModel({
        type: 'ticket',
        buyerId: id(),
        payeeId: id(),
        eventId: id(),
        items: [{ refId: id(), refModel: 'TicketTier', quantity: 11, unitPrice: 1000 }],
        amount: 11000,
        expiresAt: new Date(),
      }),
    );
    expect(errors.items).toBe('validation.order.items.maxTickets');
    expect(errors.phone).toBe('validation.order.phone.required');
  });
});

describe('TransactionModel', () => {
  it('rejects a split larger than the amount', async () => {
    const errors = await errorsOf(
      new TransactionModel({ orderId: id(), provider: 'campay', externalRef: 'ref-1', kind: 'payment', amount: 1000, payeeShare: 900, commission: 200 }),
    );
    expect(errors.commission).toBe('validation.transaction.split.exceedsAmount');
  });
});

describe('BookingModel', () => {
  it('cannot end before it starts and needs a final amount once accepted', async () => {
    const errors = await errorsOf(
      new BookingModel({
        serviceId: id(),
        providerId: id(),
        organizerId: id(),
        startDate: new Date('2026-12-20'),
        endDate: new Date('2026-12-19'),
        quantity: 2,
        status: 'accepted',
      }),
    );
    expect(errors.endDate).toBe('validation.booking.endDate.afterStart');
    expect(errors.amount).toBe('validation.booking.amount.required');
  });
});

describe('ReviewModel', () => {
  const review = (fields: object) => new ReviewModel({ target: 'event', targetId: id(), authorId: id(), ...fields });

  it('keeps ratings between 1 and 5 whole stars', async () => {
    expect((await errorsOf(review({ rating: 6 }))).rating).toBe('validation.review.rating.range');
    expect((await errorsOf(review({ rating: 3.5 }))).rating).toBe('validation.review.rating.integer');
  });

  it('links provider reviews to a booking', async () => {
    expect((await errorsOf(review({ target: 'provider', rating: 4 }))).bookingId).toBe('validation.review.bookingId.required');
  });
});

describe('ServiceModel', () => {
  it('rejects unknown categories and units', async () => {
    const errors = await errorsOf(
      new ServiceModel({ providerId: id(), category: 'boats', title: { fr: 'Bâche' }, city: 'Yaoundé', price: 5000, unit: 'per_week' }),
    );
    expect(errors.category).toBe('validation.service.category.invalid');
    expect(errors.unit).toBe('validation.service.unit.invalid');
  });
});

describe('SettingModel', () => {
  it('keeps commission between 0 and 30 percent and category keys unique', async () => {
    const errors = await errorsOf(
      new SettingModel({
        commission: { ticket: 45 },
        categories: [
          { key: 'music', en: 'Music', fr: 'Musique' },
          { key: 'music', en: 'Concerts', fr: 'Concerts' },
        ],
      }),
    );
    expect(errors['commission.ticket']).toBe('validation.setting.commission.range');
    expect(errors.categories).toBe('validation.setting.categories.duplicate');
  });
});
