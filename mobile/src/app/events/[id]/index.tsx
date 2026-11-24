import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgendaRow } from '@/components/events/details/AgendaRow';
import { ArtistCard } from '@/components/events/details/ArtistCard';
import { EventHero, HERO_HEIGHT } from '@/components/events/details/EventHero';
import { InfoRow } from '@/components/events/details/InfoRow';
import { MapPreview } from '@/components/events/details/MapPreview';
import { ShareTiles } from '@/components/events/details/ShareTiles';
import { TierRow } from '@/components/events/details/TierRow';
import { UpdatePost } from '@/components/events/details/UpdatePost';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Text } from '@/components/ui/Text';
import { useEventFormatter } from '@/features/events/formatEvent';
import { getTierStock } from '@/features/events/tierStock';
import { localize, type UpdateTag } from '@/features/events/types';
import { EventLoadState } from '@/components/events/EventLoadState';
import { useEventDetails } from '@/features/events/useEvents';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatDateRange, formatDayMonthTime, formatTimeRange, getEventSpan } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { copyToClipboard, eventUrl, openInMaps, shareNative } from '@/lib/share';
import { useTheme } from '@/theme';

const UPDATE_FILTERS: (UpdateTag | 'all')[] = ['all', 'lineup', 'location', 'info'];
const VISIBLE_UPDATES = 2;
const ABOUT_COLLAPSED_LINES = 3;

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventResource = useEventDetails(id);
  const event = eventResource.data;
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useEventFormatter();
  const [updateFilter, setUpdateFilter] = useState<UpdateTag | 'all'>('all');
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const { scheme } = useTheme();

  const visibleUpdates = useMemo(
    () => (event?.updates ?? []).filter((update) => updateFilter === 'all' || update.tag === updateFilter).slice(0, VISIBLE_UPDATES),
    [event, updateFilter],
  );

  if (!event) return <EventLoadState resource={eventResource} icon="calendar-outline" />;

  const { organizer } = event;
  const title = format.title(event);
  const url = eventUrl(event.id);
  const shareMessage = t('events.shareMessage', { title, venue: event.venue });
  const span = getEventSpan(event.startAt, event.endAt);
  const availableTiers = event.tiers.filter((tier) => getTierStock(tier).available);
  const cheapest = availableTiers.reduce<number | undefined>((min, tier) => (min === undefined ? tier.price : Math.min(min, tier.price)), undefined);
  const salesEnd = event.tiers.reduce<string | undefined>((latest, tier) => (!latest || tier.salesEndAt > latest ? tier.salesEndAt : latest), undefined);
  const eyebrow = [format.category(event), event.tagline ? localize(event.tagline, language) : undefined].filter(Boolean).join(' · ');
  const agendaDay = event.agenda.filter((item) => item.day === 1);
  const mapQuery = `${event.address.label}, ${event.address.line}`;

  const copyAddress = async () => {
    await copyToClipboard(mapQuery);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={pastHero && scheme === 'light' ? 'dark' : 'light'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        scrollEventThrottle={16}
        onScroll={(scrollEvent) => {
          const next = scrollEvent.nativeEvent.contentOffset.y > HERO_HEIGHT - insets.top - 28;
          setPastHero((current) => (current === next ? current : next));
        }}
      >
        <EventHero photos={event.gallery.length > 0 ? event.gallery : event.coverUrl ? [event.coverUrl] : []} onShare={() => shareNative(`${shareMessage} ${url}`)} />

        <View className="-mt-7 gap-7 rounded-t-[28px] bg-background px-6 pt-6">
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between gap-3">
              <Text variant="eyebrow" tone="accent" className="flex-1" numberOfLines={1}>
                {eyebrow}
              </Text>
              {event.rating ? (
                <View
                  className="flex-row items-center gap-1"
                  accessible
                  accessibilityLabel={t('eventDetails.rating', { average: event.rating.average, count: event.rating.count })}
                >
                  <Ionicons name="star" size={16} color={colors.accentText} />
                  <Text variant="link">{event.rating.average.toFixed(1)}</Text>
                  <Text variant="bodySm" tone="muted">{`(${event.rating.count})`}</Text>
                </View>
              ) : null}
            </View>
            <Text variant="display" accessibilityRole="header">
              {title}
            </Text>
          </View>

          <View className="gap-4">
            <InfoRow
              icon="calendar"
              title={formatDateRange(event.startAt, event.endAt, language)}
              subtitle={
                span.multiDay
                  ? `${formatTimeRange(event.startAt, event.endAt, language)} · ${t('eventDetails.days', { count: span.days })}`
                  : formatTimeRange(event.startAt, event.endAt, language)
              }
            />
            <InfoRow
              icon="location"
              title={event.venue}
              subtitle={
                <Text variant="bodySm" tone="muted">
                  {`${event.city}, ${t('common.country')} · `}
                  <Text variant="link" tone="accent" accessibilityRole="link" onPress={() => openInMaps(mapQuery)}>
                    {t('eventDetails.viewOnMap')}
                  </Text>
                </Text>
              }
            />
            {organizer ? (
              <InfoRow
                icon="people"
                highlighted
                title={
                  <View className="flex-row items-center gap-1">
                    <Text variant="subheading" numberOfLines={1} className="shrink">
                      {organizer.name}
                    </Text>
                    {organizer.verified ? <MaterialCommunityIcons name="check-decagram" size={18} color={colors.accentText} /> : null}
                  </View>
                }
                subtitle={t('eventDetails.organizerMeta', { count: organizer.eventsCount })}
                onPress={() => undefined}
                accessibilityLabel={`${organizer.name}, ${t('eventDetails.organizerMeta', { count: organizer.eventsCount })}`}
              />
            ) : null}
          </View>

          {event.tiers.length > 0 ? (
            <View className="gap-3.5">
              <SectionHeader
                title={t('eventDetails.tickets')}
                note={salesEnd ? t('eventDetails.salesEnd', { date: formatDayMonthTime(salesEnd, language) }) : undefined}
              />
              <View className="gap-2.5">
                {event.tiers.map((tier) => (
                  <TierRow key={tier.id} tier={tier} />
                ))}
              </View>
            </View>
          ) : null}

          {event.lineup.length > 0 ? (
            <View className="gap-3.5">
              <SectionHeader title={t('eventDetails.lineup')} actionLabel={t('eventDetails.seeAllCount', { count: event.lineupTotal })} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6" contentContainerClassName="gap-4 px-6">
                {event.lineup.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View className="gap-2.5">
            <SectionHeader title={t('eventDetails.about')} />
            <Text tone="secondary" numberOfLines={aboutExpanded ? undefined : ABOUT_COLLAPSED_LINES}>
              {localize(event.about, language)}
            </Text>
            <Text variant="link" tone="accent" accessibilityRole="button" onPress={() => setAboutExpanded((value) => !value)}>
              {aboutExpanded ? t('eventDetails.readLess') : t('eventDetails.readMore')}
            </Text>
          </View>

          {event.updates.length > 0 ? (
            <View className="gap-3.5">
              <SectionHeader title={t('eventDetails.updates')} actionLabel={t('eventDetails.seeAllCount', { count: event.updatesTotal })} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6" contentContainerClassName="gap-2 px-6">
                {UPDATE_FILTERS.map((filter) => (
                  <Chip
                    key={filter}
                    label={t(filter === 'all' ? 'events.categories.all' : `events.updateTags.${filter}`)}
                    selected={updateFilter === filter}
                    onPress={() => setUpdateFilter(filter)}
                  />
                ))}
              </ScrollView>
              {visibleUpdates.length > 0 ? (
                visibleUpdates.map((update) => (
                  <UpdatePost key={update.id} update={update} author={organizer?.name ?? ''} verified={!!organizer?.verified} />
                ))
              ) : (
                <Text variant="bodySm" tone="muted">
                  {t('eventDetails.noUpdates')}
                </Text>
              )}
            </View>
          ) : null}

          {agendaDay.length > 0 ? (
            <View className="gap-3.5">
              <SectionHeader title={t('eventDetails.agendaDay', { day: 1 })} actionLabel={t('eventDetails.fullAgenda')} />
              <View>
                {agendaDay.map((item) => (
                  <AgendaRow key={item.id} item={item} />
                ))}
              </View>
            </View>
          ) : null}

          <View className="gap-3.5">
            <SectionHeader title={t('eventDetails.location')} />
            <MapPreview
              pinLabel={event.address.pin}
              waterLabel={event.city === 'Douala' ? t('eventDetails.wouriRiver') : undefined}
              onPress={() => openInMaps(mapQuery)}
              accessibilityLabel={t('eventDetails.viewOnMap')}
            />
            <View className="gap-0.5">
              <Text variant="subheading">{event.address.label}</Text>
              <Text variant="bodySm" tone="muted">
                {event.address.line}
              </Text>
            </View>
            <View className="flex-row gap-2.5">
              <Button
                size="md"
                variant="outline"
                label={t('eventDetails.directions')}
                onPress={() => openInMaps(mapQuery)}
                fullWidth={false}
                className="flex-1"
              />
              <Button
                size="md"
                variant="secondary"
                label={addressCopied ? t('eventDetails.addressCopied') : t('eventDetails.copyAddress')}
                onPress={copyAddress}
                fullWidth={false}
                className="flex-1"
              />
            </View>
          </View>

          <View className="gap-3.5">
            <SectionHeader title={t('eventDetails.bringYourPeople')} />
            <ShareTiles url={url} message={shareMessage} />
          </View>
        </View>
      </ScrollView>

      {pastHero ? (
        <View pointerEvents="none" className="absolute left-0 right-0 top-0 border-b border-border bg-background" style={{ height: insets.top }} />
      ) : null}

      <StickyActionBar
        caption={cheapest === undefined ? t('eventDetails.unavailable') : availableTiers.length > 1 ? t('eventDetails.from') : t('eventDetails.price')}
        amount={cheapest === undefined ? '—' : cheapest === 0 ? t('events.free') : formatMoney(cheapest)}
        actionLabel={cheapest === undefined ? t('tickets.stock.soldOut') : t('eventDetails.getTickets')}
        disabled={cheapest === undefined}
        onAction={() => router.push({ pathname: '/events/[id]/tickets', params: { id: event.id } })}
      />
    </View>
  );
}
