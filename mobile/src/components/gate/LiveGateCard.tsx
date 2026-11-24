import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useGateFormatter } from '@/features/gate/formatGate';
import type { GateEvent } from '@/features/gate/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

type LiveGateCardProps = {
  event: GateEvent;
  onStart: () => void;
};

export function LiveGateCard({ event, onStart }: LiveGateCardProps) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const format = useGateFormatter();
  const progress = event.capacity > 0 ? Math.min(1, event.checkedIn / event.capacity) : 0;

  return (
    <View className="gap-4 rounded-[20px] border-2 border-accent bg-surface p-[18px]">
      <View className="flex-row items-center justify-between">
        <View className="rounded-full bg-valid px-2.5 py-[3px]">
          <Text variant="eyebrow" tone={scheme === 'dark' ? 'onAccent' : 'onPrimary'}>
            {t('gate.events.live')}
          </Text>
        </View>
        {event.gate ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="location" size={16} color={colors.foregroundMuted} />
            <Text variant="bodySmStrong" tone="secondary">
              {event.gate}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="gap-1">
        <Text variant="sectionTitle">{format.title(event.title)}</Text>
        <Text variant="bodySm" tone="muted">
          {format.eventMeta(event)}
        </Text>
      </View>

      <View className="gap-2">
        <View className="flex-row items-end justify-between gap-3">
          <Text accessibilityLabel={t('gate.events.checkedInLabel', { count: event.checkedIn, total: event.capacity })}>
            <Text variant="headline">{format.count(event.checkedIn)} </Text>
            <Text variant="subtitle" tone="muted">
              {t('gate.events.ofTotal', { total: format.count(event.capacity) })}
            </Text>
          </Text>
          <Text variant="captionStrong" tone="secondary">
            {t('gate.events.mine', { count: format.count(event.scannedByMe) })}
          </Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-background">
          <View className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </View>
      </View>

      <Button
        label={t('gate.events.start')}
        icon={<MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.onAction} />}
        onPress={onStart}
      />
    </View>
  );
}
