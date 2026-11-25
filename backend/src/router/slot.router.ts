import { Router } from 'express';
import * as ctrl from '../controller/slot.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireEventOwner, requireSlotOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { idParam, pageQuery } from '../schema/common.schema';
import * as s from '../schema/slot.schema';

export const eventSlotRouter = Router({ mergeParams: true });

eventSlotRouter.get('/', validate({ params: s.eventIdParam }), optionalAuthenticate, ctrl.list);
eventSlotRouter.post(
  '/',
  authenticate,
  authorize('organizer'),
  validate({ params: s.eventIdParam, body: s.createSlotBody }),
  requireEventOwner,
  ctrl.create,
);

export const eventExhibitorRouter = Router({ mergeParams: true });

eventExhibitorRouter.get('/', validate({ params: s.eventIdParam }), ctrl.eventExhibitors);

export const eventSlotBookingRouter = Router({ mergeParams: true });

eventSlotBookingRouter.get(
  '/',
  authenticate,
  authorize('organizer', 'admin'),
  validate({ params: s.eventIdParam }),
  requireEventOwner,
  ctrl.eventSlotBookings,
);

export const slotRouter = Router();

slotRouter.patch(
  '/:id',
  authenticate,
  authorize('organizer'),
  validate({ params: idParam, body: s.updateSlotBody }),
  requireSlotOwner,
  ctrl.update,
);
slotRouter.delete(
  '/:id',
  authenticate,
  authorize('organizer'),
  validate({ params: idParam }),
  requireSlotOwner,
  ctrl.remove,
);

export const exhibitorRouter = Router();

exhibitorRouter.use(authenticate, authorize('exhibitor'));
exhibitorRouter.get('/events', validate({ query: s.exhibitorEventsQuery }), ctrl.exhibitorEvents);
exhibitorRouter.get('/slot-bookings', validate({ query: pageQuery }), ctrl.mySlotBookings);
