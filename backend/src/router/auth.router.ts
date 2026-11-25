import { Router } from 'express';
import * as ctrl from '../controller/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import * as s from '../schema/auth.schema';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: s.registerBody }), ctrl.register);
authRouter.post('/login', authLimiter, validate({ body: s.loginBody }), ctrl.login);
authRouter.post('/google', authLimiter, validate({ body: s.googleBody }), ctrl.google);
authRouter.post('/refresh', validate({ body: s.refreshBody }), ctrl.refresh);
authRouter.post('/logout', authenticate, validate({ body: s.logoutBody }), ctrl.logout);
authRouter.post('/forgot-password', authLimiter, validate({ body: s.forgotPasswordBody }), ctrl.forgotPassword);
authRouter.post('/reset-password', authLimiter, validate({ body: s.resetPasswordBody }), ctrl.resetPassword);

authRouter.get('/me', authenticate, ctrl.me);
authRouter.patch('/me', authenticate, validate({ body: s.updateMeBody }), ctrl.updateMe);
authRouter.post('/me/push-tokens', authenticate, validate({ body: s.pushTokenBody }), ctrl.addPushToken);
authRouter.delete('/me/push-tokens', authenticate, validate({ body: s.pushTokenBody }), ctrl.removePushToken);
