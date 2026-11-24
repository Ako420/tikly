import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTicketFormatter } from '@/features/tickets/formatTicket';
import type { TicketBundle } from '@/features/tickets/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { palette, ThemeScope, useTheme } from '@/theme';
import { TicketNotch } from './TicketNotch';

type TicketListCardProps = {
  bundle: TicketBundle;
  onPress: () => void;
};

const NOTCH = 20;

export function TicketListCard({ bundle, onPress }: TicketListCardProps) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const format = useTicketFormatter();
  const when = format.when(bundle);
  const badge = format.badge(bundle);
  const title = format.title(bundle);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('myTickets.open', { title, when: when.label, quantity: format.quantity(bundle) })}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
    >
      <ThemeScope
        scheme="light"
        className={cn('flex-row overflow-hidden rounded-card bg-surface-raised', scheme === 'light' && 'border border-border')}
      >
        <View
          className="w-16 items-center justify-center"
          style={{ backgroundColor: when.past ? palette.line200 : palette.violet100 }}
        >
          <Text variant="dateDayLg" tone={when.past ? 'secondary' : 'primary'}>
            {badge.day}
          </Text>
          <Text variant="tagStrong" tone={when.past ? 'muted' : 'accent'}>
            {badge.month}
          </Text>
        </View>

        <View className="flex-1 gap-1 p-3.5">
          {when.soon ? (
            <View className="self-start rounded-full bg-accent px-2 py-px">
              <Text variant="eyebrow" tone="onAccent">
                {when.label}
              </Text>
            </View>
          ) : (
            <Text variant="eyebrow" tone={when.past ? 'muted' : 'accent'}>
              {when.label}
            </Text>
          )}
          <Text variant="title" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {format.meta(bundle)}
          </Text>
          <View className="mt-1 self-start rounded-full px-2 py-0.5" style={{ backgroundColor: palette.violet100 }}>
            <Text variant="tagStrong" tone="accent">
              {format.quantity(bundle)}
            </Text>
          </View>
        </View>

        <View className="w-px border-l-2 border-dashed border-border">
          <TicketNotch size={NOTCH} color={colors.background} outlined={scheme === 'light'} style={{ left: -11, top: -NOTCH / 2 - 1 }} />
          <TicketNotch size={NOTCH} color={colors.background} outlined={scheme === 'light'} style={{ left: -11, bottom: -NOTCH / 2 - 1 }} />
        </View>

        <View className="w-[72px] items-center justify-center gap-1">
          <MaterialCommunityIcons name="qrcode" size={30} color={when.past ? palette.ink400 : palette.violet950} />
          <Text variant="tagStrong" tone={when.past ? 'muted' : 'accent'}>
            {t(when.past ? 'myTickets.view' : 'myTickets.show')}
          </Text>
        </View>
      </ThemeScope>
    </Pressable>
  );
}
