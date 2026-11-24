import { Router } from 'express';
import * as ctrl from '../controller/notification.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { idParam, pageQuery } from '../schema/common.schema';

export const myNotificationRouter = Router();

myNotificationRouter.use(authenticate);
myNotificationRouter.get('/', validate({ query: pageQuery }), ctrl.listMine);
myNotificationRouter.patch('/read-all', ctrl.readAll);
myNotificationRouter.patch('/:id/read', validate({ params: idParam }), ctrl.read);
