import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormScreen } from '@/components/ui/FormScreen';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { playScanFeedback } from '@/features/gate/feedback';
import { useGateFormatter } from '@/features/gate/formatGate';
import { gateStore, useGateEvent, useGateStaff, useGateState } from '@/features/gate/gateStore';
import { leaveTo, scannerHref } from '@/features/gate/navigation';
import type { LookupQuery, ScannedTicket } from '@/features/gate/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { isCameroonMobile, toInternationalCameroonNumber } from '@/lib/validation';
import { palette, useTheme } from '@/theme';

type Mode = 'code' | 'phone';

const SEARCH_DELAY_MS = 400;
const MIN_CODE_LENGTH = 8;

function StatusChip({ ticket }: { ticket: ScannedTicket }) {
  const { t } = useTranslation();
  const format = useGateFormatter();
  const entry = ticket.checkIns.find((checkIn) => checkIn.type === 'entry');
  const look =
    ticket.status === 'cancelled' || ticket.status === 'refunded'
      ? { background: palette.red400, color: palette.white, label: t('gate.lookup.cancelled') }
      : ticket.status === 'checked_in' || entry
        ? { background: palette.orange500, color: palette.violet950, label: entry ? t('gate.lookup.inAt', { time: format.time(entry.at) }) : t('gate.lookup.checkedIn') }
        : { background: palette.green400, color: palette.violet950, label: t('gate.lookup.notIn') };

  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: look.background }}>
      <Text variant="tagStrong" style={{ color: look.color }}>
        {look.label}
      </Text>
    </View>
  );
}

export default function GateLookup() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const event = useGateEvent(eventId);
  const staff = useGateStaff();
  const { soundOn } = useGateState();
  const format = useGateFormatter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorMessage = useApiErrorMessage();
  const [mode, setMode] = useState<Mode>('code');
  const [value, setValue] = useState('');
  const [results, setResults] = useState<ScannedTicket[]>();
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const [reentered, setReentered] = useState<{ ticketId: string; at: string }>();

  const trimmed = value.trim();
  const searchValue =
    mode === 'code'
      ? trimmed.length >= MIN_CODE_LENGTH
        ? trimmed.toUpperCase()
        : ''
      : isCameroonMobile(trimmed)
        ? toInternationalCameroonNumber(trimmed)
        : '';

  useEffect(() => {
    if (!eventId || !searchValue) return;
    const query: LookupQuery = mode === 'code' ? { code: searchValue } : { phone: searchValue };
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(undefined);
      try {
        const found = await gateStore.lookup(eventId, query);
        if (active) setResults(found);
      } catch (caught) {
        if (active) setError(errorMessage(caught));
      } finally {
        if (active) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [eventId, mode, searchValue, version, errorMessage]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setValue('');
    setResults(undefined);
    setError(undefined);
  };

  const checkIn = async (ticket: ScannedTicket) => {
    if (!eventId) return;
    setBusyId(ticket.id);
    try {
      const outcome = await gateStore.scan(eventId, ticket.code, staff.name, true);
      router.push({ pathname: '/gate/[eventId]/result', params: { eventId, scanId: outcome.id } });
      setVersion((current) => current + 1);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(undefined);
    }
  };

  const reentry = async (ticket: ScannedTicket) => {
    if (!eventId) return;
    setBusyId(ticket.id);
    try {
      await gateStore.reentry(eventId, ticket.id, staff.name);
      playScanFeedback('valid', soundOn);
      setReentered({ ticketId: ticket.id, at: new Date().toISOString() });
      setVersion((current) => current + 1);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(undefined);
    }
  };

  const back = () => leaveTo(eventId ? scannerHref(eventId) : '/gate');
  const holder = results?.[0]?.holderName;

  return (
    <FormScreen
      contentClassName="gap-5 pt-1"
      header={
        <View className="h-[52px] flex-row items-center gap-3 px-6">
          <IconButton icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />} accessibilityLabel={t('common.back')} onPress={back} />
          <Text variant="eyebrow" tone="accent" className="flex-1 pr-10 text-center" numberOfLines={1}>
            {[event?.gate, event ? format.title(event.title) : undefined].filter(Boolean).join(' · ')}
          </Text>
        </View>
      }
    >
      <View className="gap-2">
        <Text variant="headline" accessibilityRole="header">
          {t('gate.lookup.title')}
        </Text>
        <Text tone="secondary">{t('gate.lookup.body')}</Text>
      </View>

      <SegmentedControl<Mode>
        value={mode}
        onChange={switchMode}
        segments={[
          { value: 'code', label: t('gate.lookup.byCode') },
          { value: 'phone', label: t('gate.lookup.byPhone') },
        ]}
      />

      <TextField
        key={mode}
        label={mode === 'code' ? t('gate.lookup.codeLabel') : t('gate.lookup.phoneLabel')}
        value={value}
        onChangeText={(next) => setValue(mode === 'code' ? next.toUpperCase() : next)}
        placeholder={mode === 'code' ? t('gate.lookup.codePlaceholder') : t('gate.lookup.phonePlaceholder')}
        leading={<Ionicons name={mode === 'code' ? 'keypad-outline' : 'phone-portrait-outline'} size={20} color={colors.foregroundMuted} />}
        keyboardType={mode === 'phone' ? 'phone-pad' : 'default'}
        autoCapitalize={mode === 'code' ? 'characters' : 'none'}
        autoCorrect={false}
        autoFocus
      />

      {searching ? (
        <ActivityIndicator color={colors.accentText} />
      ) : error ? (
        <Text variant="bodySm" tone="invalid" accessibilityRole="alert">
          {error}
        </Text>
      ) : results && results.length === 0 ? (
        <EmptyState icon="search" title={t('gate.lookup.noneTitle')} body={t('gate.lookup.noneBody')} />
      ) : results ? (
        <View className="gap-3">
          <Text variant="eyebrow" tone="muted">
            {t(results.length === 1 ? 'gate.lookup.resultsHeaderOne' : 'gate.lookup.resultsHeaderOther', { count: results.length, name: holder ?? '' })}
          </Text>
          {results.map((ticket) => {
            const inside = ticket.status === 'checked_in' || ticket.checkIns.some((checkIn) => checkIn.type === 'entry');
            const voided = ticket.status === 'cancelled' || ticket.status === 'refunded';
            return (
              <View key={ticket.id} className="gap-3 rounded-card border border-border bg-surface p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-0.5">
                    <Text variant="subheading">{format.tierLine(ticket)}</Text>
                    <Text variant="caption" tone="muted">
                      {ticket.code}
                    </Text>
                  </View>
                  <StatusChip ticket={ticket} />
                </View>
                {reentered?.ticketId === ticket.id ? (
                  <View className="flex-row items-center gap-1.5" accessibilityLiveRegion="polite">
                    <Ionicons name="checkmark-circle" size={16} color={colors.valid} />
                    <Text variant="captionStrong" tone="valid">
                      {t('gate.lookup.reentryRecorded', { time: format.time(reentered.at) })}
                    </Text>
                  </View>
                ) : null}
                {voided ? null : inside ? (
                  <Button variant="outline" label={t('gate.result.allowReentry')} loading={busyId === ticket.id} onPress={() => reentry(ticket)} />
                ) : (
                  <Button label={t('gate.lookup.checkInNow')} loading={busyId === ticket.id} onPress={() => checkIn(ticket)} />
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      <View className="mt-auto flex-row items-start gap-2.5 pt-4">
        <Ionicons name="information-circle" size={18} color={colors.accent} />
        <Text variant="caption" tone="secondary" className="flex-1">
          {t('gate.lookup.idHint')}
        </Text>
      </View>
    </FormScreen>
  );
}
