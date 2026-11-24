import { Router } from 'express';
import { accessRouter, eventCheckinRouter } from './access.router';
import { adminRouter } from './admin.router';
import { authRouter } from './auth.router';
import { bookingRouter } from './booking.router';
import { categoryRouter, eventRouter, organizerEventRouter } from './event.router';
import { healthRouter } from './health.router';
import { myNotificationRouter } from './notification.router';
import { myOrderRouter, orderRouter } from './order.router';
import { paymentRouter } from './payment.router';
import { eventStaffRouter, organizerStaffRouter, staffEventsRouter } from './staff.router';
import { myTicketRouter, ticketRouter } from './ticket.router';
import { planningRouter } from './planning.router';
import { providerRouter } from './provider.router';
import { eventReviewRouter, providerReviewRouter } from './review.router';
import { serviceRouter } from './service.router';
import {
  eventExhibitorRouter,
  eventSlotBookingRouter,
  eventSlotRouter,
  exhibitorRouter,
  slotRouter,
} from './slot.router';
import { eventTierRouter, tierRouter } from './tier.router';
import { uploadRouter } from './upload.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/events/:eventId/tiers', eventTierRouter);
apiRouter.use('/events/:eventId/staff', eventStaffRouter);
apiRouter.use('/events/:eventId/checkins', eventCheckinRouter);
apiRouter.use('/events/:eventId/slots', eventSlotRouter);
apiRouter.use('/events/:eventId/reviews', eventReviewRouter);
apiRouter.use('/events/:eventId/exhibitors', eventExhibitorRouter);
apiRouter.use('/events/:eventId/slot-bookings', eventSlotBookingRouter);
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
apiRouter.use('/organizer/staff', organizerStaffRouter);
apiRouter.use('/staff/events', staffEventsRouter);
apiRouter.use('/access', accessRouter);
apiRouter.use('/providers/:providerId/reviews', providerReviewRouter);
apiRouter.use('/providers', providerRouter);
apiRouter.use('/services', serviceRouter);
apiRouter.use('/bookings', bookingRouter);
apiRouter.use('/slots', slotRouter);
apiRouter.use('/exhibitor', exhibitorRouter);
apiRouter.use('/me/notifications', myNotificationRouter);
apiRouter.use('/admin', adminRouter);
