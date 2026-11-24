import { Router } from 'express';
import * as ctrl from '../controller/provider.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { idParam, pageQuery } from '../schema/common.schema';
import * as s from '../schema/provider.schema';

export const providerRouter = Router();

const asProvider = [authenticate, authorize('provider')];

providerRouter.post('/me', ...asProvider, validate({ body: s.createProviderBody }), ctrl.create);
providerRouter.get('/me', ...asProvider, ctrl.getMine);
providerRouter.patch('/me', ...asProvider, validate({ body: s.updateProviderBody }), ctrl.updateMine);
providerRouter.get('/me/services', ...asProvider, validate({ query: pageQuery }), ctrl.myServices);
providerRouter.get('/me/earnings', ...asProvider, validate({ query: s.earningsQuery }), ctrl.earnings);
providerRouter.get('/:id', validate({ params: idParam }), ctrl.getPublic);
