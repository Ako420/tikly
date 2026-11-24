import { Router } from 'express';
import * as ctrl from '../controller/event.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireEventOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/event.schema';

export const eventRouter = Router();

eventRouter.get('/', validate({ query: s.listEventsQuery }), ctrl.listPublic);
eventRouter.get('/:id', validate({ params: idParam }), optionalAuthenticate, ctrl.getOne);
eventRouter.get('/:id/share', validate({ params: idParam }), ctrl.share);

eventRouter.post('/', authenticate, authorize('organizer'), validate({ body: s.createEventBody }), ctrl.create);
eventRouter.patch(
  '/:id',
  authenticate,
  authorize('organizer'),
  validate({ params: idParam, body: s.updateEventBody }),
  requireEventOwner,
  ctrl.update,
);
eventRouter.delete(
  '/:id',
  authenticate,
  authorize('organizer'),
  validate({ params: idParam }),
  requireEventOwner,
  ctrl.remove,
);
eventRouter.post(
  '/:id/submit',
  authenticate,
  authorize('organizer'),
  validate({ params: idParam }),
  requireEventOwner,
  ctrl.submit,
);
eventRouter.post(
  '/:id/cancel',
  authenticate,
  authorize('organizer'),
  validate({ params: idParam, body: s.cancelEventBody }),
  requireEventOwner,
  ctrl.cancel,
);
eventRouter.get(
  '/:id/stats',
  authenticate,
  authorize('organizer', 'admin'),
  validate({ params: idParam }),
  requireEventOwner,
  ctrl.stats,
);

export const organizerEventRouter = Router();

organizerEventRouter.get(
  '/',
  authenticate,
  authorize('organizer'),
  validate({ query: s.organizerEventsQuery }),
  ctrl.listMine,
);

export const categoryRouter = Router();

categoryRouter.get('/', ctrl.categories);
