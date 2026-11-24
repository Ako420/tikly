import { Router } from 'express';
import * as ctrl from '../controller/booking.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireBookingParty } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/booking.schema';

export const bookingRouter = Router();

bookingRouter.use(authenticate);
bookingRouter.post('/', authorize('organizer'), validate({ body: s.createBookingBody }), ctrl.create);
bookingRouter.get('/', authorize('organizer', 'provider'), validate({ query: s.listBookingsQuery }), ctrl.list);
bookingRouter.get('/:id', validate({ params: idParam }), requireBookingParty, ctrl.getOne);
bookingRouter.post(
  '/:id/accept',
  authorize('provider'),
  validate({ params: idParam, body: s.acceptBookingBody }),
  requireBookingParty,
  ctrl.accept,
);
bookingRouter.post(
  '/:id/decline',
  authorize('provider'),
  validate({ params: idParam, body: s.declineBookingBody }),
  requireBookingParty,
  ctrl.decline,
);
bookingRouter.post(
  '/:id/cancel',
  authorize('organizer'),
  validate({ params: idParam }),
  requireBookingParty,
  ctrl.cancel,
);
bookingRouter.post(
  '/:id/complete',
  authorize('provider'),
  validate({ params: idParam }),
  requireBookingParty,
  ctrl.complete,
);
