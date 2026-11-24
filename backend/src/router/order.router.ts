import { Router } from 'express';
import * as ctrl from '../controller/order.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { paymentLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/order.schema';

export const orderRouter = Router();

orderRouter.post(
  '/tickets',
  authenticate,
  authorize('attendee'),
  paymentLimiter,
  validate({ body: s.createTicketOrderBody }),
  ctrl.createTicketOrder,
);
orderRouter.post(
  '/bookings',
  authenticate,
  authorize('organizer'),
  paymentLimiter,
  validate({ body: s.createBookingOrderBody }),
  ctrl.createBookingOrder,
);
orderRouter.get('/:id', authenticate, validate({ params: idParam }), ctrl.getOne);
orderRouter.post('/:id/verify', authenticate, paymentLimiter, validate({ params: idParam }), ctrl.verify);

export const myOrderRouter = Router();

myOrderRouter.get('/', authenticate, validate({ query: s.listMyOrdersQuery }), ctrl.listMine);
