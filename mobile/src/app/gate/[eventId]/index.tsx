import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ManualCodeSheet } from '@/components/gate/ManualCodeSheet';
import { Viewfinder } from '@/components/gate/Viewfinder';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useGateFormatter } from '@/features/gate/formatGate';
import { gateStore, useGateEvent, useGateStaff, useGateState } from '@/features/gate/gateStore';
import { leaveTo } from '@/features/gate/navigation';
import { SCAN_COOLDOWN_MS } from '@/features/gate/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { palette, ThemeScope, withAlpha } from '@/theme';

const VIEWFINDER_MAX = 270;
const OVERLAY = withAlpha(palette.violet950, 0.45);
const CHROME = withAlpha(palette.violet950, 0.6);

function RoundButton({ icon, label, onPress, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      onPress={onPress}
      hitSlop={6}
      className="h-11 w-11 items-center justify-center rounded-full"
      style={{ backgroundColor: active ? palette.amber400 : CHROME }}
    >
      <Ionicons name={icon} size={22} color={active ? palette.violet950 : palette.white} />
    </Pressable>
  );
}

export default function GateScanner() {
  useKeepAwake();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const event = useGateEvent(eventId);
  const { soundOn, lastEntry } = useGateState();
  const staff = useGateStaff();
  const format = useGateFormatter();
  const { t } = useTranslation();
  const errorMessage = useApiErrorMessage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [torch, setTorch] = useState(false);
  const [checking, setChecking] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const busy = useRef(false);
  const lastRead = useRef({ value: '', at: 0 });

  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      setFocused(true);
      return () => {
        setFocused(false);
        setTorch(false);
      };
    }, []),
  );

  const check = useCallback(
    async (value: string, manual: boolean) => {
      if (!eventId || busy.current) return;
      busy.current = true;
      setChecking(true);
      try {
        const outcome = await gateStore.scan(eventId, value, staff.name, manual);
        setManualOpen(false);
        router.push({ pathname: '/gate/[eventId]/result', params: { eventId, scanId: outcome.id } });
      } catch (caught) {
        busy.current = false;
        Alert.alert(t('gate.scanner.checkFailed'), errorMessage(caught));
      } finally {
        setChecking(false);
      }
    },
    [eventId, staff.name, t, errorMessage],
  );

  const onBarcode = useCallback(
    ({ data }: BarcodeScanningResult) => {
      const now = Date.now();
      if (data === lastRead.current.value && now - lastRead.current.at < SCAN_COOLDOWN_MS) return;
      lastRead.current = { value: data, at: now };
      check(data, false);
    },
    [check],
  );

  if (!event) {
    return (
      <ThemeScope scheme="dark" className="flex-1 justify-center bg-background">
        <StatusBar style="light" />
        <EmptyState icon="alert-circle-outline" title={t('gate.scanner.notAssigned')} body={t('gate.scanner.notAssignedBody')} actionLabel={t('common.back')} onAction={() => leaveTo('/gate')} />
      </ThemeScope>
    );
  }

  const last = lastEntry[event.id];
  const viewfinder = Math.min(VIEWFINDER_MAX, width - 120);
  const cameraReady = permission?.granted && focused;

  const openSettings = () => Linking.openSettings();

  return (
    <ThemeScope scheme="dark" className="flex-1 bg-background">
      <StatusBar style="light" />
      {cameraReady ? (
        <CameraView
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={checking || manualOpen ? undefined : onBarcode}
        />
      ) : null}
      <View className="absolute inset-0" style={{ backgroundColor: OVERLAY }} />

      <View className="flex-row items-center justify-between px-5" style={{ paddingTop: insets.top + 8 }}>
        <RoundButton icon="close" label={t('gate.scanner.close')} onPress={() => leaveTo('/gate')} />
        <View className="flex-1 items-center px-3">
          <Text variant="subtitle" numberOfLines={1} accessibilityRole="header">
            {format.title(event.title)}
          </Text>
          {event.gate ? (
            <Text variant="eyebrow" tone="accent">
              {event.gate}
            </Text>
          ) : null}
        </View>
        <RoundButton icon="flash" label={t('gate.scanner.torch')} active={torch} onPress={() => setTorch((value) => !value)} />
      </View>

      <View className="flex-1 items-center justify-center gap-6">
        {permission && !permission.granted ? (
          <View className="mx-8 gap-4 self-stretch rounded-card p-6" style={{ backgroundColor: CHROME }}>
            <View className="items-center">
              <Ionicons name="camera-outline" size={40} color={palette.amber400} />
            </View>
            <Text variant="title" className="text-center">
              {t('gate.scanner.cameraTitle')}
            </Text>
            <Text variant="bodySm" tone="secondary" className="text-center">
              {t('gate.scanner.cameraBody')}
            </Text>
            <Button
              label={permission.canAskAgain ? t('gate.scanner.allowCamera') : t('gate.scanner.openSettings')}
              onPress={permission.canAskAgain ? requestPermission : openSettings}
            />
          </View>
        ) : (
          <>
            <Viewfinder size={viewfinder} scanning={!!cameraReady && !checking} />
            <View className="flex-row items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: CHROME }}>
              {checking ? <ActivityIndicator size="small" color={palette.amber400} /> : null}
              <Text variant="bodySmStrong">{checking ? t('gate.scanner.checking') : t('gate.scanner.hint')}</Text>
            </View>
          </>
        )}
      </View>

      <View className="gap-3 rounded-t-[28px] border-t border-border bg-surface px-5 pt-5" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-0.5 rounded-2xl bg-background p-3.5">
            <Text variant="sectionTitle">{format.count(event.checkedIn)}</Text>
            <Text variant="caption" tone="muted">
              {t('gate.scanner.checkedInOf', { total: format.count(event.capacity) })}
            </Text>
          </View>
          <View className="flex-1 gap-0.5 rounded-2xl bg-background p-3.5">
            {last?.ticket ? (
              <>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkmark-circle" size={18} color={palette.green400} />
                  <Text variant="subheading">{format.time(last.scannedAt)}</Text>
                </View>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {format.lastLine(last.ticket)}
                </Text>
              </>
            ) : (
              <>
                <Text variant="subheading">{t('gate.scanner.noScansTitle')}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {t('gate.scanner.noScansBody')}
                </Text>
              </>
            )}
          </View>
        </View>
        <View className="flex-row gap-3">
          <Button
            variant="outline"
            fullWidth={false}
            className="flex-1"
            label={t('gate.scanner.enterCode')}
            icon={<Ionicons name="keypad-outline" size={20} color={palette.amber400} />}
            onPress={() => setManualOpen(true)}
          />
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={t('gate.scanner.sound')}
            accessibilityState={{ checked: soundOn }}
            onPress={gateStore.toggleSound}
            className="h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: soundOn ? palette.amber400 : palette.violet950 }}
          >
            <Ionicons name={soundOn ? 'volume-high' : 'volume-mute'} size={24} color={soundOn ? palette.violet950 : palette.white} />
          </Pressable>
        </View>
      </View>

      <ManualCodeSheet visible={manualOpen} checking={checking} onClose={() => setManualOpen(false)} onSubmit={(code) => check(code, true)} />
    </ThemeScope>
  );
}
