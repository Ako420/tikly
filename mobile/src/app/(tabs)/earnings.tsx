import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { ScreenTitle } from '@/components/marketplace/ScreenTitle';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { marketplaceApi } from '@/features/marketplace/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme';

type Period = 'month' | 'year' | 'all';

const periodStart = (period: Period) => {
  const now = new Date();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  if (period === 'year') return new Date(now.getFullYear(), 0, 1).toISOString();
  return undefined;
};

export default function Earnings() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorMessage = useApiErrorMessage();
  const [period, setPeriod] = useState<Period>('month');
  const earnings = useAsync(() => marketplaceApi.earnings(periodStart(period)), period);
  const data = earnings.data;

  const rows = data
    ? [
        { key: 'gross', value: formatMoney(data.gross) },
        { key: 'commission', value: `− ${formatMoney(data.commission)}` },
        { key: 'refunded', value: `− ${formatMoney(data.refunded)}` },
        { key: 'paidBookings', value: String(data.paidBookings) },
      ]
    : [];

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerClassName="gap-5 px-6 pb-8 pt-3"
        refreshControl={<RefreshControl refreshing={false} onRefresh={earnings.reload} tintColor={colors.accentText} />}
      >
        <ScreenTitle eyebrow={t('provider.earnings.eyebrow')} title={t('provider.earnings.title')} />
        <SegmentedControl
          segments={(['month', 'year', 'all'] as const).map((value) => ({ value, label: t(`provider.earnings.periods.${value}`) }))}
          value={period}
          onChange={setPeriod}
        />
        <View className="gap-1 rounded-[22px] bg-surface p-5">
          <Text variant="eyebrow" tone="accent">
            {t('provider.earnings.net')}
          </Text>
          <Text variant="display">{formatMoney(data?.net ?? 0)}</Text>
          {earnings.error ? (
            <Text variant="bodySm" tone="invalid">
              {errorMessage(earnings.error)}
            </Text>
          ) : null}
        </View>
        <View className="rounded-2xl border border-border bg-surface-raised">
          {rows.map((row, index) => (
            <View key={row.key} className={`flex-row items-center justify-between px-4 py-3.5 ${index > 0 ? 'border-t border-border' : ''}`}>
              <Text variant="bodySm" tone="secondary">
                {t(`provider.earnings.rows.${row.key}`)}
              </Text>
              <Text variant="subtitle">{row.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
