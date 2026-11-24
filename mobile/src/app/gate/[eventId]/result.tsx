import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { playScanFeedback, toneFor, type FeedbackTone } from '@/features/gate/feedback';
import { useGateFormatter } from '@/features/gate/formatGate';
import { gateStore, useGateEvent, useGateStaff, useGateState, useScanOutcome } from '@/features/gate/gateStore';
import { leaveTo, scannerHref } from '@/features/gate/navigation';
import { AUTO_RETURN_SECONDS, type ScanOutcome } from '@/features/gate/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { palette, ThemeScope } from '@/theme';

type Look = { background: string; foreground: string; icon: ReactNode; statusBar: 'light' | 'dark' };

const looks: Record<FeedbackTone, Look> = {
  valid: {
    background: palette.green700,
    foreground: palette.white,
    statusBar: 'light',
    icon: <Ionicons name="checkmark" size={88} color={palette.green700} />,
  },
  warning: {
    background: palette.orange500,
    foreground: palette.violet950,
    statusBar: 'dark',
    icon: <Ionicons name="time" size={84} color={palette.violet950} />,
  },
  error: {
    background: palette.red600,
    foreground: palette.white,
    statusBar: 'light',
    icon: <Ionicons name="close" size={96} color={palette.red600} />,
  },
};

function ResultButton({
  label,
  onPress,
  variant,
  foreground,
  icon,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant: 'solid' | 'outline';
  foreground: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}) {
  const solid = variant === 'solid';
  const color = solid ? palette.violet950 : foreground;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ busy: !!loading }} disabled={loading} onPress={onPress}>
      {({ pressed }) => (
        <View
          className={cn('flex-row items-center justify-center gap-2.5 rounded-[20px]', solid ? 'h-[68px]' : 'h-[60px] border-2')}
          style={[solid ? { backgroundColor: palette.white } : { borderColor: foreground }, { opacity: pressed ? 0.8 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color={color} />
          ) : (
            <>
              {icon ? <Ionicons name={icon} size={20} color={color} /> : null}
              <Text variant={solid ? 'titleLg' : 'subheading'} style={{ color }}>
                {label}
              </Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

function useAutoReturn(enabled: boolean, eventId: string) {
  const [seconds, setSeconds] = useState(AUTO_RETURN_SECONDS);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (enabled && seconds === 0) leaveTo(scannerHref(eventId));
  }, [enabled, seconds, eventId]);

  return seconds;
}

function useResultCopy(outcome: ScanOutcome, { staffName, eventTitle }: { staffName: string; eventTitle: string }) {
  const { t } = useTranslation();
  const format = useGateFormatter();
  const ticket = outcome.ticket;
  const first = ticket ? format.firstEntry(ticket) : undefined;

  switch (outcome.result) {
    case 'VALID':
      return {
        title: t('gate.result.valid'),
        subtitle: t('gate.result.validSubtitle'),
        eyebrow: ticket ? format.tierLine(ticket) : undefined,
        heading: ticket?.holderName,
        meta: ticket?.code,
        line: t('gate.result.checkedInBy', { time: format.time(outcome.scannedAt), staff: format.shortName(staffName) }),
      };
    case 'ALREADY_CHECKED_IN':
      return {
        title: t('gate.result.alreadyIn'),
        subtitle: first ? t('gate.result.alreadyInSubtitle', { time: format.time(first.at), ago: format.ago(first.at) }) : t('gate.result.alreadyInFallback'),
        eyebrow: ticket ? format.tierLine(ticket) : undefined,
        heading: ticket?.holderName,
        meta: ticket?.code,
        line: first
          ? t(first.gate ? 'gate.result.lastEntryAtGate' : 'gate.result.lastEntry', {
              gate: first.gate ?? '',
              staff: format.shortName(first.staffName),
              count: ticket ? format.reentries(ticket) : 0,
            })
          : undefined,
      };
    case 'WRONG_EVENT':
      return {
        title: t('gate.result.invalid'),
        subtitle: t('gate.result.wrongEventSubtitle'),
        eyebrow: ticket
          ? t('gate.result.otherEventEyebrow', { tier: t(`tickets.tiers.${ticket.tier}`) })
          : t('gate.result.otherEventEyebrowShort'),
        heading: outcome.otherEvent ? format.title(outcome.otherEvent.title) : ticket?.code,
        meta: outcome.otherEvent ? format.otherEventMeta(outcome.otherEvent.startAt, outcome.otherEvent.venue) : undefined,
        line: t('gate.result.askForTicket', { event: eventTitle }),
      };
    case 'CANCELLED':
      return {
        title: t('gate.result.invalid'),
        subtitle: t('gate.result.cancelledSubtitle'),
        eyebrow: ticket ? format.tierLine(ticket) : undefined,
        heading: ticket?.holderName,
        meta: ticket?.code,
        line: t('gate.result.cancelledLine'),
      };
    default:
      return {
        title: t('gate.result.invalid'),
        subtitle: t('gate.result.unknownSubtitle'),
        eyebrow: t('gate.result.unknownEyebrow'),
        heading: t('gate.result.unknownHeading'),
        meta: undefined,
        line: t('gate.result.unknownLine'),
      };
  }
}

function ResultContent({ outcome }: { outcome: ScanOutcome }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const format = useGateFormatter();
  const errorMessage = useApiErrorMessage();
  const event = useGateEvent(outcome.eventId);
  const staff = useGateStaff();
  const { soundOn } = useGateState();
  const tone = toneFor(outcome.result);
  const look = looks[tone];
  const eventTitle = event ? format.title(event.title) : '';
  const copy = useResultCopy(outcome, { staffName: staff.name, eventTitle });
  const seconds = useAutoReturn(tone === 'valid', outcome.eventId);
  const [allowing, setAllowing] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    playScanFeedback(tone, soundOn);
  }, [tone, soundOn]);

  const scanNext = () => leaveTo(scannerHref(outcome.eventId));

  const allowReentry = async () => {
    setAllowing(true);
    try {
      await gateStore.allowReentry(outcome, staff.name);
      playScanFeedback('valid', soundOn);
      scanNext();
    } catch (caught) {
      Alert.alert(t('gate.result.reentryFailed'), errorMessage(caught));
    } finally {
      setAllowing(false);
    }
  };

  const footer =
    tone === 'valid'
      ? [t('gate.result.backIn', { seconds }), soundOn ? t('gate.result.beepPlayed') : null]
      : tone === 'warning'
        ? [t('gate.result.yourCall'), soundOn ? t('gate.result.buzzPlayed') : null]
        : [soundOn ? t('gate.result.errorPlayed') : t('gate.result.doNotAdmit')];

  const fg = { color: look.foreground };

  return (
    <View className="flex-1 px-6" style={{ backgroundColor: look.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <StatusBar style={look.statusBar} />
      <Text variant="eyebrow" className="text-center" style={fg} numberOfLines={1}>
        {[event?.gate, eventTitle].filter(Boolean).join(' · ')}
      </Text>

      <View className="flex-1 justify-center gap-5" accessibilityLiveRegion="assertive">
        <View className="items-center gap-3">
          <View className="mb-3 h-[148px] w-[148px] items-center justify-center rounded-full bg-white">{look.icon}</View>
          <Text variant="resultTitle" className="text-center" style={fg} accessibilityRole="header">
            {copy.title}
          </Text>
          <Text variant="titleLg" className="text-center" style={fg}>
            {copy.subtitle}
          </Text>
        </View>

        <ThemeScope scheme="light" className="gap-1.5 rounded-[20px] bg-surface-raised p-[18px]">
          {copy.eyebrow ? (
            <Text variant="eyebrow" tone={tone === 'error' ? 'invalid' : 'accent'}>
              {copy.eyebrow}
            </Text>
          ) : null}
          {copy.heading ? <Text variant="sectionTitle">{copy.heading}</Text> : null}
          {copy.meta ? (
            <Text variant="bodySm" tone="muted">
              {copy.meta}
            </Text>
          ) : null}
          {copy.line ? (
            <Text variant="bodySm" className="mt-1.5">
              {copy.line}
            </Text>
          ) : null}
        </ThemeScope>
      </View>

      <View className="gap-3">
        {outcome.result === 'ALREADY_CHECKED_IN' && outcome.ticket ? (
          <ResultButton
            variant="outline"
            foreground={look.foreground}
            icon="refresh"
            label={t('gate.result.allowReentry')}
            onPress={allowReentry}
            loading={allowing}
          />
        ) : null}
        <ResultButton variant="solid" foreground={look.foreground} label={t('gate.result.scanNext')} onPress={scanNext} />
        <Text variant="bodySmStrong" className="text-center" style={fg}>
          {footer.filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );
}

export default function ScanResultScreen() {
  const { scanId } = useLocalSearchParams<{ eventId: string; scanId: string }>();
  const outcome = useScanOutcome(scanId);
  const { t } = useTranslation();

  if (!outcome) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-6" style={{ backgroundColor: palette.violet950 }}>
        <StatusBar style="light" />
        <Text variant="title" style={{ color: palette.white }}>
          {t('gate.result.missing')}
        </Text>
        <ResultButton variant="solid" foreground={palette.white} label={t('gate.result.scanNext')} onPress={() => leaveTo('/gate')} />
      </View>
    );
  }

  return <ResultContent outcome={outcome} />;
}
