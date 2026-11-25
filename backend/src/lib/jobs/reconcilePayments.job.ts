import type { Agenda } from 'agenda';
import { RECONCILE_BATCH } from '../../config/constants';
import { reconcilePayments } from '../../service/order.service';
import { logger } from '../logger';

export const RECONCILE_PAYMENTS = 'reconcile-payments';

export function defineReconcilePayments(agenda: Agenda) {
  agenda.define(
    RECONCILE_PAYMENTS,
    async () => {
      const checked = await reconcilePayments(new Date(), RECONCILE_BATCH);
      if (checked) logger.info({ checked }, 'Reconciled payments with the provider');
    },
    { concurrency: 1, lockLifetime: 10 * 60 * 1000 },
  );
}
