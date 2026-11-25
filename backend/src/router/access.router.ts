import { Router } from 'express';
import * as ctrl from '../controller/access.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireEventAccess, requireEventOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import * as s from '../schema/access.schema';
import { eventIdParam, idParam } from '../schema/common.schema';

export const accessRouter = Router();

accessRouter.use(authenticate, authorize('staff', 'organizer'));
accessRouter.post('/scan', validate({ body: s.scanBody }), requireEventAccess, ctrl.scan);
accessRouter.post(
  '/tickets/:id/reentry',
  validate({ params: idParam, body: s.reentryBody }),
  requireEventAccess,
  ctrl.reentry,
);
accessRouter.get('/lookup', validate({ query: s.lookupQuery }), requireEventAccess, ctrl.lookup);

export const eventCheckinRouter = Router({ mergeParams: true });

eventCheckinRouter.get(
  '/',
  authenticate,
  authorize('organizer', 'admin'),
  validate({ params: eventIdParam }),
  requireEventOwner,
  ctrl.checkins,
);
