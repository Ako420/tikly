import type { UserStatus } from '../types/enums';
import { AppError } from './AppError';

export function assertActive(status: UserStatus | null | undefined) {
  if (status === 'suspended') throw AppError.forbidden('ACCOUNT_SUSPENDED');
  if (status === 'disabled') throw AppError.forbidden('ACCOUNT_DISABLED');
}
