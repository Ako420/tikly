import type { Agenda } from 'agenda';
import { EXPIRE_ORDERS_BATCH } from '../../config/constants';
import { expireDueOrders } from '../../service/order.service';
import { logger } from '../logger';

export const EXPIRE_ORDERS = 'expire-orders';

export function defineExpireOrders(agenda: Agenda) {
  agenda.define(
    EXPIRE_ORDERS,
    async () => {
      const expired = await expireDueOrders(new Date(), EXPIRE_ORDERS_BATCH);
      if (expired) logger.info({ expired }, 'Expired unpaid orders');
    },
    { concurrency: 1, lockLifetime: 5 * 60 * 1000 },
  );
}
