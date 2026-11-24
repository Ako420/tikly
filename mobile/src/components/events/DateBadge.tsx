import { Text } from '@/components/ui/Text';
import { ThemeScope } from '@/theme';

export function DateBadge({ day, month }: { day: string; month: string }) {
  return (
    <ThemeScope scheme="light" className="h-[52px] w-12 items-center justify-center rounded-xl bg-surface-raised">
      <Text variant="dateDay">{day}</Text>
      <Text variant="label" tone="accent">
        {month}
      </Text>
    </ThemeScope>
  );
}
