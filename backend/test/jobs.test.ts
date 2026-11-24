import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { startJobs, stopJobs } from '../src/lib/agenda';
import { COMPLETE_EVENTS } from '../src/lib/jobs/completeEvents.job';
import { EXPIRE_ORDERS } from '../src/lib/jobs/expireOrders.job';
import { SEND_REMINDERS } from '../src/lib/jobs/sendReminders.job';
import { testDatabaseUri, useTestDatabase } from './helpers/db';

useTestDatabase('jobs');

describe('background jobs (REL-3)', () => {
  it('stores the expire-orders schedule in MongoDB so it survives restarts', async () => {
    await startJobs(testDatabaseUri('jobs'));
    try {
      const job = await mongoose.connection.db!.collection('jobs').findOne({ name: EXPIRE_ORDERS });
      expect(job).toMatchObject({ name: EXPIRE_ORDERS, repeatInterval: '1 minute' });
      const completion = await mongoose.connection.db!.collection('jobs').findOne({ name: COMPLETE_EVENTS });
      expect(completion).toMatchObject({ repeatInterval: '1 hour' });
      const reminders = await mongoose.connection.db!.collection('jobs').findOne({ name: SEND_REMINDERS });
      expect(reminders).toMatchObject({ repeatInterval: '15 minutes' });
    } finally {
      await stopJobs();
    }
  });
});
