import { Router } from 'express';
import * as ctrl from '../controller/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import * as s from '../schema/admin.schema';
import { idParam } from '../schema/common.schema';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'));

adminRouter.get('/events', validate({ query: s.adminEventsQuery }), ctrl.listEvents);
adminRouter.post('/events/:id/approve', validate({ params: idParam }), ctrl.approveEvent);
adminRouter.post('/events/:id/reject', validate({ params: idParam, body: s.rejectEventBody }), ctrl.rejectEvent);
adminRouter.patch('/events/:id/status', validate({ params: idParam, body: s.eventStatusBody }), ctrl.setEventStatus);

adminRouter.get('/providers', validate({ query: s.adminProvidersQuery }), ctrl.listProviders);
adminRouter.get('/providers/:id', validate({ params: idParam }), ctrl.getProvider);
adminRouter.post('/providers/:id/verify', validate({ params: idParam }), ctrl.verifyProvider);
adminRouter.post(
  '/providers/:id/reject',
  validate({ params: idParam, body: s.rejectProviderBody }),
  ctrl.rejectProvider,
);

adminRouter.get('/users', validate({ query: s.adminUsersQuery }), ctrl.listUsers);
adminRouter.patch('/users/:id/status', validate({ params: idParam, body: s.userStatusBody }), ctrl.setUserStatus);

adminRouter.patch(
  '/services/:id/status',
  validate({ params: idParam, body: s.serviceStatusBody }),
  ctrl.setServiceStatus,
);
adminRouter.patch('/reviews/:id/hide', validate({ params: idParam, body: s.hideReviewBody }), ctrl.hideReview);

adminRouter.get('/stats', validate({ query: s.statsQuery }), ctrl.stats);
adminRouter.get('/settings', ctrl.settings);
adminRouter.patch('/settings', validate({ body: s.updateSettingsBody }), ctrl.changeSettings);
