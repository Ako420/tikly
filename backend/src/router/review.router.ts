import { Router } from 'express';
import * as ctrl from '../controller/review.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import * as s from '../schema/review.schema';

export const eventReviewRouter = Router({ mergeParams: true });

eventReviewRouter.get('/', validate({ params: s.eventIdParam, query: s.pageQuery }), ctrl.listForEvent);
eventReviewRouter.post(
  '/',
  authenticate,
  authorize('attendee'),
  validate({ params: s.eventIdParam, body: s.eventReviewBody }),
  ctrl.reviewEvent,
);

export const providerReviewRouter = Router({ mergeParams: true });

providerReviewRouter.get('/', validate({ params: s.providerIdParam, query: s.pageQuery }), ctrl.listForProvider);
providerReviewRouter.post(
  '/',
  authenticate,
  authorize('organizer'),
  validate({ params: s.providerIdParam, body: s.providerReviewBody }),
  ctrl.reviewProvider,
);
