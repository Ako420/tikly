import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { startJobs, stopJobs } from '../src/lib/agenda';
import { EXPIRE_ORDERS } from '../src/lib/jobs/expireOrders.job';
import { testDatabaseUri, useTestDatabase } from './helpers/db';

useTestDatabase('jobs');

describe('background jobs (REL-3)', () => {
  it('stores the expire-orders schedule in MongoDB so it survives restarts', async () => {
    await startJobs(testDatabaseUri('jobs'));
    try {
      const job = await mongoose.connection.db!.collection('jobs').findOne({ name: EXPIRE_ORDERS });
      expect(job).toMatchObject({ name: EXPIRE_ORDERS, repeatInterval: '1 minute' });
    } finally {
      await stopJobs();
    }
  });
});
