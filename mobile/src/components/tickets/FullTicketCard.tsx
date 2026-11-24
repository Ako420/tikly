import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { QrCode } from '@/components/ui/QrCode';
import { Text } from '@/components/ui/Text';
import type { IssuedTicket } from '@/features/orders/types';
import { useTicketFormatter } from '@/features/tickets/formatTicket';
import type { TicketBundle } from '@/features/tickets/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { palette, ThemeScope, useTheme } from '@/theme';
import { TicketNotch } from './TicketNotch';

type FullTicketCardProps = {
  bundle: TicketBundle;
  ticket: IssuedTicket;
  width: number;
};

const NOTCH = 24;
const QR_TILE_MAX = 302;
const QR_TILE_INSET = 40;
const QR_PADDING = 26;

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text variant="captionSm" tone="secondary">
        {label}
      </Text>
      <Text variant="subtitle" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function FullTicketCard({ bundle, ticket, width }: FullTicketCardProps) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const format = useTicketFormatter();
  const tile = Math.min(QR_TILE_MAX, width - QR_TILE_INSET);
  const notchProps = { size: NOTCH, color: colors.background, outlined: scheme === 'light' };

  return (
    <ThemeScope
      scheme="light"
      className={cn('overflow-hidden rounded-[22px] bg-surface-raised', scheme === 'light' && 'border border-border')}
      style={{ width }}
    >
      <View className="gap-1 px-5 pb-4 pt-[18px]">
        <Text variant="eyebrow" tone="accent">
          {format.doors(bundle)}
        </Text>
        <Text variant="sectionTitle" numberOfLines={2}>
          {format.title(bundle)}
        </Text>
      </View>

      <View className="mx-5 h-0.5 border-t-2 border-dashed border-border">
        <TicketNotch {...notchProps} style={{ left: -20 - NOTCH / 2, top: -NOTCH / 2 }} />
        <TicketNotch {...notchProps} style={{ right: -20 - NOTCH / 2, top: -NOTCH / 2 }} />
      </View>

      <View className="items-center gap-3 px-4 pb-3.5 pt-[18px]">
        <View className="items-center justify-center rounded-2xl border border-border" style={{ width: tile, height: tile }}>
          {ticket.qrToken ? (
            <QrCode
              value={ticket.qrToken}
              size={tile - QR_PADDING}
              accessibilityLabel={t('payments.success.qrLabel', { code: ticket.code })}
            />
          ) : (
            <View className="items-center gap-2 px-6">
              <Ionicons name="qr-code-outline" size={40} color={palette.ink400} />
              <Text variant="caption" tone="muted" className="text-center">
                {t('myTickets.detail.qrUnavailable')}
              </Text>
            </View>
          )}
        </View>
        <Text variant="ticketCode" selectable>
          {ticket.code}
        </Text>
      </View>

      <View className="mx-5 mb-[18px] flex-row gap-2 rounded-[14px] bg-surface p-3">
        <Detail label={t('myTickets.detail.holder')} value={format.holder(ticket.holderName)} />
        <Detail label={t('myTickets.detail.tier')} value={format.tier(bundle)} />
        <Detail label={t('myTickets.detail.entrance')} value={format.entrance(bundle)} />
      </View>
    </ThemeScope>
  );
}
