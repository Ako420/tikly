import { useCallback } from 'react';
import { useTranslation } from '@/i18n/I18nProvider';
import { toApiError } from './errors';

/** Turns any thrown error into a message for the user. API messages are already translated via Accept-Language. */
export function useApiErrorMessage() {
  const { t } = useTranslation();
  return useCallback(
    (error: unknown) => {
      const apiError = toApiError(error);
      if (apiError.isNetworkError) return t('errors.network');
      if (apiError.code === 'INTERNAL' && !apiError.status) return t('errors.generic');
      return apiError.message || t('errors.generic');
    },
    [t],
  );
}
