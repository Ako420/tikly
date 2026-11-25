import { api } from '@/lib/http/client';
import { ApiError } from '@/lib/http/errors';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type ProviderProfile = {
  id: string;
  businessName: string;
  verification: VerificationStatus;
};

const PENDING_LIMIT = 100;

export const providerApi = {
  me: () =>
    api.get<ProviderProfile>('/providers/me').catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }),
  pendingRequestCount: () =>
    api
      .get<unknown[]>('/bookings', { params: { status: 'requested', limit: PENDING_LIMIT } })
      .then((bookings) => bookings.length),
};
