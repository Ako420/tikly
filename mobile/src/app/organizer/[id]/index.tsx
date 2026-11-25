import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { organizerApi } from '@/features/organizer/api';
import { daysUntil } from '@/features/organizer/format';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatAmount, formatMoney } from '@/lib/money';
import { eventUrl, shareNative } from '@/lib/share';
import { useAsync } from '@/lib/useAsync';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const compact = (amount: number) =>
  amount >= 1_000_000 ? `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : amount >= 1000 ? `${Math.round(amount / 1000)}k` : String(amount);

async function loadWorkspace(id: string) {
  const [event, stats, counts, staff] = await Promise.all([
    organizerApi.event(id),
    organizerApi.stats(id).catch(() => undefined),
    organizerApi.workspace(id),
    organizerApi.staff().catch(() => []),
  ]);
  return { event, stats, counts, staffCount: staff.filter((member) => member.events.some((item) => item.id === id)).length };
}

export default function EventWorkspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useMarketplaceFormat();
  const now = useNow();
  const workspace = useAsync(() => loadWorkspace(id), id);
  const { reload } = workspace;
  const focusedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  if (!workspace.data) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accentText} size="large" />
        </View>
      </Screen>
    );
  }

  const { event, stats, counts, staffCount } = workspace.data;
  const title = format.text(event.title);
  const days = daysUntil(event.startAt, now);
  const statusLine =
    event.status === 'published' && days > 0
      ? `${t('organizer.status.published')} · ${t(days === 1 ? 'organizer.dayToGo' : 'organizer.daysToGo', { count: days })}`
      : t(`organizer.status.${event.status}`);
  const tiers = stats?.tiers ?? [];
  const capacity = tiers.reduce((sum, tier) => sum + tier.quantity, 0);

  const tiles: { key: string; icon: IconName; value: string; onPress?: () => void }[] = [
    {
      key: 'budget',
      icon: 'wallet',
      value: counts.budget ? t('organizer.tiles.budgetValue', { actual: compact(counts.budget.actual), planned: compact(counts.budget.planned) }) : '—',
    },
    {
      key: 'checklist',
      icon: 'checkmark-circle',
      value: counts.checklist ? t('organizer.tiles.checklistValue', { done: counts.checklist.done, total: counts.checklist.total }) : '—',
    },
    { key: 'guests', icon: 'people', value: t('organizer.tiles.guestsValue', { count: counts.guests ?? 0 }) },
    { key: 'agenda', icon: 'time', value: t('organizer.tiles.agendaValue', { count: counts.agenda ?? 0 }) },
    {
      key: 'staff',
      icon: 'qr-code',
      value: t('organizer.tiles.staffValue', { count: staffCount }),
      onPress: () => router.push({ pathname: '/organizer/[id]/staff', params: { id } }),
    },
    {
      key: 'exhibitors',
      icon: 'storefront',
      value: counts.slots?.total ? t('organizer.tiles.slotsValue', { booked: counts.slots.booked, total: counts.slots.total }) : t('organizer.tiles.noSlots'),
    },
  ];

  return (
    <Screen edges={['top']}>
      <View className="h-[52px] flex-row items-center justify-between px-6">
        <IconButton
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
        />
        <View className={cn('h-7 justify-center rounded-full px-3', event.status === 'published' ? 'bg-valid' : 'bg-surface')}>
          <Text variant="label" tone={event.status === 'published' ? 'onAccent' : 'secondary'}>
            {statusLine}
          </Text>
        </View>
        <IconButton
          accessibilityLabel={t('marketplace.detail.share')}
          onPress={() => shareNative(`${title} ${eventUrl(event.id)}`)}
          icon={<Ionicons name="share-outline" size={20} color={colors.foreground} />}
        />
      </View>

      <ScrollView
        contentContainerClassName="gap-4 px-6 pt-2"
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={workspace.loading} onRefresh={reload} tintColor={colors.accentText} />}
      >
        <View className="gap-1">
          <Text variant="eyebrow" tone="accent">
            {t('organizer.workspace')}
          </Text>
          <Text variant="headline" accessibilityRole="header">
            {title}
          </Text>
        </View>

        {stats ? (
          <View className="gap-3.5 rounded-[22px] border border-border bg-surface-raised p-4">
            <View className="flex-row justify-between gap-3">
              <View>
                <Text variant="headline">{formatAmount(stats.totals.ticketsSold)}</Text>
                <Text variant="caption" tone="muted">
                  {t('organizer.soldOfCapacity', { capacity: formatAmount(capacity) })}
                </Text>
              </View>
              <View className="items-end">
                <Text variant="amountLg" tone="accent">
                  {formatMoney(stats.totals.net)}
                </Text>
                <Text variant="caption" tone="muted">
                  {t('organizer.yourShare')}
                </Text>
              </View>
            </View>
            {tiers.map((tier) => {
              const soldOut = tier.sold >= tier.quantity;
              return (
                <View key={tier.id} className="gap-1.5">
                  <View className="flex-row justify-between">
                    <Text variant="bodySmStrong">{t(`tickets.tiers.${tier.name}`)}</Text>
                    <Text variant="bodySmStrong" tone={soldOut ? 'valid' : 'primary'}>
                      {`${formatAmount(tier.sold)} / ${formatAmount(tier.quantity)}${soldOut ? ` · ${t('organizer.soldOut')}` : ''}`}
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-surface">
                    <View
                      className={cn('h-full rounded-full', soldOut ? 'bg-valid' : 'bg-accent')}
                      style={{ width: `${Math.min(100, (tier.sold / Math.max(1, tier.quantity)) * 100)}%` }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2.5">
          {tiles.map((tile) => (
            <Pressable
              key={tile.key}
              accessibilityRole={tile.onPress ? 'button' : undefined}
              disabled={!tile.onPress}
              onPress={tile.onPress}
              className="basis-[47%] grow gap-2.5 rounded-[18px] border border-border bg-surface-raised p-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface">
                <Ionicons name={tile.icon} size={20} color={colors.accentText} />
              </View>
              <View className="gap-0.5">
                <Text variant="subtitle">{t(`organizer.tiles.${tile.key}`)}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {tile.value}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row gap-2.5 border-t border-border bg-background px-6 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {['published', 'draft', 'rejected'].includes(event.status) ? (
        <Button
          variant="outline"
          fullWidth={false}
          className="flex-1"
          label={t('organizer.editEvent')}
          icon={<Ionicons name="create-outline" size={18} color={colors.accentText} />}
          onPress={() => router.push({ pathname: '/organizer/new', params: { id } })}
        />
        ) : null}
        <Button
          fullWidth={false}
          className="flex-1"
          label={t('organizer.postUpdate')}
          icon={<Ionicons name="megaphone" size={18} color={colors.onAction} />}
          disabled={event.status !== 'published'}
          onPress={() => router.push({ pathname: '/organizer/[id]/post', params: { id } })}
        />
      </View>
    </Screen>
  );
}
