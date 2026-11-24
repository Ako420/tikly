import { useTranslation } from '@/i18n/I18nProvider';
import { formatDateBadge, formatEventDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { localize, type EventSummary } from './types';

export function useEventFormatter() {
  const { t, language } = useTranslation();

  return {
    title: (event: EventSummary) => localize(event.title, language),
    category: (event: EventSummary) => t(`events.categories.${event.category}.singular`),
    dateTime: (event: EventSummary) => formatEventDateTime(event.startAt, language),
    dateBadge: (event: EventSummary) => formatDateBadge(event.startAt, language),
    price: (event: EventSummary) =>
      event.minPrice === 0
        ? t('events.free')
        : event.hasMultipleTiers
          ? t('events.fromPrice', { price: formatMoney(event.minPrice) })
          : formatMoney(event.minPrice),
  };
}
