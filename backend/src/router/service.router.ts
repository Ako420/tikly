import { Router } from 'express';
import * as ctrl from '../controller/service.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireServiceOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/service.schema';

export const serviceRouter = Router();

serviceRouter.get('/', validate({ query: s.listServicesQuery }), ctrl.list);
serviceRouter.get('/:id', validate({ params: idParam }), optionalAuthenticate, ctrl.getOne);
serviceRouter.post('/', authenticate, authorize('provider'), validate({ body: s.createServiceBody }), ctrl.create);
serviceRouter.patch(
  '/:id',
  authenticate,
  authorize('provider'),
  validate({ params: idParam, body: s.updateServiceBody }),
  requireServiceOwner,
  ctrl.update,
);
serviceRouter.delete(
  '/:id',
  authenticate,
  authorize('provider'),
  validate({ params: idParam }),
  requireServiceOwner,
  ctrl.remove,
);
