import { Router } from 'express';
import { authRouter } from './auth.router';
import { categoryRouter, eventRouter, organizerEventRouter } from './event.router';
import { healthRouter } from './health.router';
import { uploadRouter } from './upload.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/events', eventRouter);
apiRouter.use('/organizer/events', organizerEventRouter);
apiRouter.use('/categories', categoryRouter);
