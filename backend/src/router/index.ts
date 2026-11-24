import { Router } from 'express';
import { authRouter } from './auth.router';
import { healthRouter } from './health.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
