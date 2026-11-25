import { Router } from 'express';
import * as ctrl from '../controller/tier.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireEventOwner, requireTierOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/tier.schema';

export const eventTierRouter = Router({ mergeParams: true });

eventTierRouter.get('/', validate({ params: s.eventIdParam }), optionalAuthenticate, ctrl.list);
eventTierRouter.post(
  '/',
  authenticate,
  authorize('organizer'),
  validate({ params: s.eventIdParam, body: s.createTierBody }),
  requireEventOwner,
  ctrl.create,
);

export const tierRouter = Router();

tierRouter.patch(
  '/:id',
  authenticate,
  authorize('organizer'),
  validate({ params: idParam, body: s.updateTierBody }),
  requireTierOwner,
  ctrl.update,
);
tierRouter.delete(
  '/:id',
  authenticate,
  authorize('organizer'),
  validate({ params: idParam }),
  requireTierOwner,
  ctrl.remove,
);
