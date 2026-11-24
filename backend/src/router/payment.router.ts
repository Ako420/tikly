import { Router } from 'express';
import * as ctrl from '../controller/payment.controller';

export const paymentRouter = Router();

paymentRouter.post('/webhook/:provider', ctrl.webhook);
