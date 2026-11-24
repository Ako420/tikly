import { Router } from 'express';
import * as ctrl from '../controller/post.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireEventOwner, requirePostOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/post.schema';

export const eventPostRouter = Router({ mergeParams: true });

eventPostRouter.get(
  '/',
  validate({ params: s.eventIdParam, query: s.listPostsQuery }),
  optionalAuthenticate,
  ctrl.list,
);
eventPostRouter.post(
  '/',
  authenticate,
  authorize('organizer'),
  validate({ params: s.eventIdParam, body: s.createPostBody }),
  requireEventOwner,
  ctrl.create,
);

export const postRouter = Router();

postRouter.patch(
  '/:id',
  authenticate,
  authorize('organizer', 'admin'),
  validate({ params: idParam, body: s.updatePostBody }),
  requirePostOwner,
  ctrl.update,
);
postRouter.delete(
  '/:id',
  authenticate,
  authorize('organizer', 'admin'),
  validate({ params: idParam }),
  requirePostOwner,
  ctrl.remove,
);
