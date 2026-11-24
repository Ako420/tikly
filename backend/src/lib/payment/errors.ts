import { AppError } from '../../util/AppError';

export class PaymentOutcomeUnknownError extends AppError {
  constructor() {
    super(502, 'PAYMENT_PROVIDER_ERROR');
  }
}
