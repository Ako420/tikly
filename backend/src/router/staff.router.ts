import { Router } from 'express';
import * as ctrl from '../controller/staff.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireEventOwner, requireStaffOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { eventIdParam, idParam } from '../schema/common.schema';
import * as s from '../schema/staff.schema';

export const organizerStaffRouter = Router();

organizerStaffRouter.use(authenticate, authorize('organizer'));
organizerStaffRouter.post('/', validate({ body: s.createStaffBody }), ctrl.create);
organizerStaffRouter.get('/', ctrl.list);
organizerStaffRouter.patch(
  '/:id',
  validate({ params: idParam, body: s.updateStaffBody }),
  requireStaffOwner,
  ctrl.update,
);
organizerStaffRouter.delete('/:id', validate({ params: idParam }), requireStaffOwner, ctrl.disable);

export const eventStaffRouter = Router({ mergeParams: true });

eventStaffRouter.use(authenticate, authorize('organizer'));
eventStaffRouter.post('/', validate({ params: eventIdParam, body: s.assignStaffBody }), requireEventOwner, ctrl.assign);
eventStaffRouter.delete('/:staffId', validate({ params: s.eventStaffParam }), requireEventOwner, ctrl.unassign);

export const staffEventsRouter = Router();

staffEventsRouter.get('/', authenticate, authorize('staff'), ctrl.myEvents);
