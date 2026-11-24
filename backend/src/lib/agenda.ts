import { MongoBackend } from '@agendajs/mongo-backend';
import { Agenda } from 'agenda';
import { env } from '../config/env';
import { logger } from './logger';
import { EXPIRE_ORDERS, defineExpireOrders } from './jobs/expireOrders.job';
import { RECONCILE_PAYMENTS, defineReconcilePayments } from './jobs/reconcilePayments.job';

let agenda: Agenda | undefined;

export async function startJobs(address = env.MONGO_URI) {
  agenda = new Agenda({
    backend: new MongoBackend({ address, collection: 'jobs' }),
    processEvery: '20 seconds',
  });
  agenda.on('error', (err: unknown) => logger.error({ err }, 'Job runner error'));
  defineExpireOrders(agenda);
  defineReconcilePayments(agenda);
  await agenda.start();
  await agenda.every('1 minute', EXPIRE_ORDERS);
  await agenda.every('5 minutes', RECONCILE_PAYMENTS);
  logger.info('Background jobs started');
}

export async function stopJobs() {
  await agenda?.stop(true);
  agenda = undefined;
}
