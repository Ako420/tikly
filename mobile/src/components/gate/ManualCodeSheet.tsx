import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useTranslation } from '@/i18n/I18nProvider';
import { ThemeScope, useTheme } from '@/theme';

type ManualCodeSheetProps = {
  visible: boolean;
  checking: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
};

const MIN_CODE_LENGTH = 6;

export function ManualCodeSheet({ visible, checking, onClose, onSubmit }: ManualCodeSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();
  const [code, setCode] = useState('');
  const trimmed = code.trim();

  const submit = () => {
    if (trimmed.length < MIN_CODE_LENGTH || checking) return;
    onSubmit(trimmed);
    setCode('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemeScope scheme={scheme} className="flex-1">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            className="absolute inset-0 bg-black/50"
          />
          <View className="gap-4 rounded-t-[28px] border-t border-border bg-surface px-6 pt-3" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="h-1 w-10 self-center rounded-full bg-border" />
            <View className="gap-1">
              <Text variant="sectionTitle" accessibilityRole="header">
                {t('gate.manual.title')}
              </Text>
              <Text variant="bodySm" tone="secondary">
                {t('gate.manual.body')}
              </Text>
            </View>
            <TextField
              label={t('gate.manual.label')}
              placeholder={t('gate.manual.placeholder')}
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button label={t('gate.manual.check')} onPress={submit} loading={checking} disabled={trimmed.length < MIN_CODE_LENGTH} />
          </View>
        </KeyboardAvoidingView>
      </ThemeScope>
    </Modal>
  );
}
