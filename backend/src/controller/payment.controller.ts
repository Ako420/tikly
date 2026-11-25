import type { RequestHandler } from 'express';
import { logger } from '../lib/logger';
import * as paymentService from '../service/payment.service';

export const webhook: RequestHandler = async (req, res) => {
  res.status(200).json({ received: true });
  await paymentService
    .handleWebhook(String(req.params.provider), req.body, req.headers)
    .catch((err) => logger.error({ err }, 'Webhook processing failed'));
};
