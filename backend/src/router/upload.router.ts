import { Router } from 'express';
import * as ctrl from '../controller/upload.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { documentUpload, imageUpload } from '../middleware/upload';

export const uploadRouter = Router();

uploadRouter.post(
  '/image',
  authenticate,
  authorize('organizer', 'provider', 'exhibitor', 'admin'),
  ...imageUpload,
  ctrl.image,
);
uploadRouter.post('/document', authenticate, authorize('provider'), ...documentUpload, ctrl.document);
