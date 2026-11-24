import { useState } from 'react';
import { FlatList, Image, View } from 'react-native';
import { PagerDots } from '@/components/ui/PagerDots';
import { PreviewCard } from '@/components/ui/PreviewCard';
import { QrCode } from '@/components/ui/QrCode';
import { Text } from '@/components/ui/Text';
import type { IssuedTicket } from '@/features/orders/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

const QR_SIZE = 200;

type TicketPassCardProps = {
  title: string;
  meta: string;
  coverUrl?: string;
  tierLabel: string;
  tickets: IssuedTicket[];
  width: number;
};

export function TicketPassCard({ title, meta, coverUrl, tierLabel, tickets, width }: TicketPassCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const notch = { backgroundColor: colors.background };

  return (
    <PreviewCard className="overflow-hidden">
      <View className="flex-row items-center gap-3 p-4">
        {coverUrl ? <Image source={{ uri: coverUrl }} resizeMode="cover" className="h-[52px] w-[52px] rounded-xl" /> : null}
        <View className="flex-1 gap-0.5">
          <Text variant="subheading" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
      <View className="h-5 justify-center">
        <View className="mx-5 border-t-2 border-dashed border-border" />
        <View className="absolute -left-2.5 h-5 w-5 rounded-full" style={notch} />
        <View className="absolute -right-2.5 h-5 w-5 rounded-full" style={notch} />
      </View>
      <FlatList
        data={tickets}
        keyExtractor={(ticket) => ticket.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: position }) => (
          <View style={{ width }} className="items-center gap-3 px-4 pb-4 pt-2">
            <View className="rounded-2xl border border-border p-3">
              <QrCode value={item.qrToken} size={QR_SIZE} accessibilityLabel={t('payments.success.qrLabel', { code: item.code })} />
            </View>
            <View className="items-center gap-1">
              <Text variant="overline" tone="accent">
                {t('payments.success.ticketOf', { tier: tierLabel, index: position + 1, total: tickets.length })}
              </Text>
              <Text variant="title">{item.holderName}</Text>
              <Text variant="caption" tone="muted">
                {item.code}
              </Text>
            </View>
          </View>
        )}
      />
      {tickets.length > 1 ? (
        <View className="items-center pb-4">
          <PagerDots count={tickets.length} active={index} />
        </View>
      ) : null}
    </PreviewCard>
  );
}
