import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

const DAY_MS = 24 * 60 * 60 * 1000;
const PICKABLE_DAYS = 365;
const TIMES = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`);

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const timeKey = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${date.getMinutes() < 30 ? '00' : '30'}`;

type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  compact?: boolean;
  disabled?: boolean;
  error?: boolean;
};

export function DateTimeField({ label, value, onChange, compact, disabled, error }: DateTimeFieldProps) {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const [sheet, setSheet] = useState<'day' | 'time' | null>(null);
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB';

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    return Array.from({ length: PICKABLE_DAYS }, (_, index) => {
      const date = new Date(start.getTime() + index * DAY_MS);
      return { value: dayKey(date), label: date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) };
    });
  }, [locale]);

  const display = `${value.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · ${timeKey(value)}`;

  const setDay = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    const next = new Date(value);
    next.setFullYear(year!, month! - 1, day!);
    onChange(next);
    setSheet('time');
  };

  const setTime = (key: string) => {
    const [hours, minutes] = key.split(':').map(Number);
    const next = new Date(value);
    next.setHours(hours!, minutes!, 0, 0);
    onChange(next);
    setSheet(null);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        disabled={disabled}
        onPress={() => setSheet('day')}
        className={cn(
          'flex-1 flex-row items-center gap-2.5 rounded-2xl bg-surface-raised px-3.5',
          compact ? 'h-12' : 'h-14',
          error ? 'border-2 border-invalid' : 'border border-border',
          disabled && 'opacity-50',
        )}
      >
        {compact ? null : <Ionicons name="calendar" size={20} color={colors.accentText} />}
        <View className="shrink">
          {compact ? null : (
            <Text variant="captionSm" tone="muted">
              {label}
            </Text>
          )}
          <Text variant={compact ? 'bodySmStrong' : 'subtitle'} numberOfLines={1}>
            {display}
          </Text>
        </View>
      </Pressable>
      <OptionSheet visible={sheet === 'day'} title={label} options={days} value={dayKey(value)} onSelect={setDay} onClose={() => setSheet(null)} />
      <OptionSheet
        visible={sheet === 'time'}
        title={t('organizer.form.pickTime')}
        options={TIMES.map((time) => ({ value: time, label: time }))}
        value={timeKey(value)}
        onSelect={setTime}
        onClose={() => setSheet(null)}
      />
    </>
  );
}
