import { Router } from 'express';
import * as ctrl from '../controller/sales.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireEventOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { eventIdParam } from '../schema/common.schema';
import * as s from '../schema/sales.schema';

export const eventSalesRouter = Router({ mergeParams: true });

const owner = [authenticate, authorize('organizer', 'admin')];

eventSalesRouter.get(
  '/orders',
  ...owner,
  validate({ params: eventIdParam, query: s.eventOrdersQuery }),
  requireEventOwner,
  ctrl.orders,
);
eventSalesRouter.get(
  '/attendees',
  ...owner,
  validate({ params: eventIdParam, query: s.eventAttendeesQuery }),
  requireEventOwner,
  ctrl.attendees,
);
