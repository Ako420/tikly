import { Router } from 'express';
import * as ctrl from '../controller/ticket.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { paymentLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/ticket.schema';

export const ticketRouter = Router();

ticketRouter.get('/:id', authenticate, validate({ params: idParam }), ctrl.getOne);
ticketRouter.get('/:id/pdf', authenticate, validate({ params: idParam }), ctrl.pdf);
ticketRouter.post(
  '/:id/cancel',
  authenticate,
  authorize('attendee'),
  paymentLimiter,
  validate({ params: idParam }),
  ctrl.cancel,
);

export const myTicketRouter = Router();

myTicketRouter.get('/', authenticate, authorize('attendee'), validate({ query: s.myTicketsQuery }), ctrl.listMine);
