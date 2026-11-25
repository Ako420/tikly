import mongoose, { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { isDbConnected } from '../src/config/db';
import { withTransaction } from '../src/lib/transaction';
import { EventModel, TicketTierModel, UserModel } from '../src/model';
import { useTestDatabase } from './helpers/db';

useTestDatabase('database_test');

const user = (overrides: object = {}) => ({
  name: 'Ama Nkeng',
  email: 'ama@example.cm',
  phone: '677000000',
  passwordHash: 'hash',
  role: 'attendee',
  ...overrides,
});

describe('connection', () => {
  it('connects to a replica set, never to the configured MONGO_URI', () => {
    expect(isDbConnected()).toBe(true);
    expect(mongoose.connection.name).toBe('database_test');
    expect(mongoose.connection.host).toBe('127.0.0.1');
  });

  it('builds every model index at startup', async () => {
    const userIndexes = await UserModel.collection.indexes();
    expect(userIndexes.map((index) => index.name)).toEqual(expect.arrayContaining(['email_1', 'phone_1']));
    const eventIndexes = await EventModel.collection.indexes();
    expect(eventIndexes.map((index) => index.name)).toContain('event_text');
  });

  it('enforces unique indexes', async () => {
    await UserModel.create(user());
    await expect(UserModel.create(user({ email: 'other@example.cm' }))).rejects.toMatchObject({
      code: 11000,
      keyPattern: { phone: 1 },
    });
  });
});

describe('withTransaction', () => {
  it('commits every write together', async () => {
    await withTransaction(async (session) => {
      await UserModel.create([user()], { session });
      await UserModel.create([user({ email: 'ben@example.cm', phone: '677000001' })], { session });
    });
    expect(await UserModel.countDocuments()).toBe(2);
  });

  it('rolls back every write when one step fails', async () => {
    await expect(
      withTransaction(async (session) => {
        await UserModel.create([user()], { session });
        throw new Error('payment provider rejected the collection');
      }),
    ).rejects.toThrow('payment provider rejected the collection');
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('returns the value of the work', async () => {
    const id = await withTransaction(async (session) => {
      const [created] = await UserModel.create([user()], { session });
      return created!.id as string;
    });
    expect(await UserModel.exists({ _id: id })).toBeTruthy();
  });
});

describe('atomic stock reservation (TKT-4, REL-2)', () => {
  it('never reserves more tickets than the tier holds under concurrent orders', async () => {
    const tier = await TicketTierModel.create({
      eventId: new Types.ObjectId(),
      name: 'vip',
      price: 15000,
      quantity: 5,
      salesEndAt: new Date(Date.now() + 86_400_000),
    });
    const reserveOne = () =>
      TicketTierModel.findOneAndUpdate(
        { _id: tier._id, $expr: { $lte: [{ $add: ['$sold', '$reserved', 1] }, '$quantity'] } },
        { $inc: { reserved: 1 } },
        { new: true },
      );
    const results = await Promise.all(Array.from({ length: 12 }, reserveOne));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect((await TicketTierModel.findById(tier._id))!.reserved).toBe(5);
  });
});
