import { useCallback } from 'react';
import { localize, type LocalizedText } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';
import type { ServiceCategory, ServiceUnit } from './types';

export function useMarketplaceFormat() {
  const { t, language } = useTranslation();
  const text = useCallback((value: LocalizedText) => localize(value, language), [language]);
  const unit = useCallback((value: ServiceUnit) => t(`marketplace.units.${value}`), [t]);
  const category = useCallback((value: ServiceCategory) => t(`marketplace.categories.${value}`), [t]);
  const day = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    [language],
  );
  const range = useCallback(
    (start: string, end: string) => {
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
      const a = new Date(start).toLocaleDateString(locale, opts);
      const b = new Date(end).toLocaleDateString(locale, opts);
      return a === b ? a : `${a} – ${b}`;
    },
    [language],
  );
  return { text, unit, category, day, range, language };
}
