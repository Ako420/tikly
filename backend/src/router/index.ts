import { Router } from 'express';
import { authRouter } from './auth.router';
import { categoryRouter, eventRouter, organizerEventRouter } from './event.router';
import { healthRouter } from './health.router';
import { myOrderRouter, orderRouter } from './order.router';
import { paymentRouter } from './payment.router';
import { myTicketRouter, ticketRouter } from './ticket.router';
import { planningRouter } from './planning.router';
import { eventTierRouter, tierRouter } from './tier.router';
import { uploadRouter } from './upload.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/events/:eventId/tiers', eventTierRouter);
apiRouter.use('/events/:eventId', planningRouter);
apiRouter.use('/events', eventRouter);
apiRouter.use('/tiers', tierRouter);
apiRouter.use('/organizer/events', organizerEventRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/me/orders', myOrderRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/tickets', ticketRouter);
apiRouter.use('/me/tickets', myTicketRouter);
