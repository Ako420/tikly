import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useTranslation } from '@/i18n/I18nProvider';
import { CURRENCY } from '@/lib/money';
import { ThemeScope, useTheme } from '@/theme';

type AcceptSheetProps = {
  title: string;
  suggested: number;
  onConfirm: (amount: number) => Promise<void>;
  onClose: () => void;
};

export function AcceptSheet({ title, suggested, onConfirm, onClose }: AcceptSheetProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const [value, setValue] = useState(String(suggested));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const amount = Number(value.replace(/\D/g, ''));

  const confirm = async () => {
    if (!amount) {
      setError(t('provider.accept.amountRequired'));
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onConfirm(amount);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemeScope scheme={scheme} className="flex-1 justify-end">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} className="absolute inset-0 bg-black/50" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="gap-4 rounded-t-[28px] border-t border-border bg-surface px-6 pb-10 pt-3">
            <View className="h-1 w-10 self-center rounded-full bg-border" />
            <View className="gap-1">
              <Text variant="sectionTitle">{t('provider.accept.title')}</Text>
              <Text variant="bodySm" tone="muted">
                {title}
              </Text>
            </View>
            <TextField
              label={t('provider.accept.amount', { currency: CURRENCY })}
              hint={t('provider.accept.hint')}
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              error={error}
            />
            <Button label={t('provider.accept.confirm')} loading={saving} onPress={confirm} />
          </View>
        </KeyboardAvoidingView>
      </ThemeScope>
    </Modal>
  );
}
