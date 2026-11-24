import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { PhonePrefix } from '@/components/ui/PhonePrefix';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { authApi, type User } from '@/features/auth/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { isCameroonMobile, toInternationalCameroonNumber, toLocalCameroonNumber } from '@/lib/validation';
import { ThemeScope, useTheme } from '@/theme';

type EditProfileSheetProps = {
  user: User;
  visible: boolean;
  onClose: () => void;
  onSaved: (user: User) => void;
};

export function EditProfileSheet({ user, visible, onClose, onSaved }: EditProfileSheetProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const errorMessage = useApiErrorMessage();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(toLocalCameroonNumber(user.phone));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const nameError = !name.trim() ? t('auth.errors.nameRequired') : undefined;
  const phoneError = !isCameroonMobile(phone) ? t('auth.errors.phoneInvalid') : undefined;

  const save = async () => {
    setSubmitted(true);
    if (nameError || phoneError || saving) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const updated = await authApi.updateMe({ name: name.trim(), phone: toInternationalCameroonNumber(phone) });
      onSaved(updated);
      onClose();
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemeScope scheme={scheme} className="flex-1">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} className="absolute inset-0 bg-black/50" />
          <View className="gap-4 rounded-t-[28px] border-t border-border bg-surface px-6 pt-3" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="h-1 w-10 self-center rounded-full bg-border" />
            <Text variant="sectionTitle" accessibilityRole="header">
              {t('profile.edit.title')}
            </Text>
            <TextField
              label={t('auth.fields.fullName')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              error={submitted ? nameError : undefined}
            />
            <TextField
              label={t('profile.edit.phone')}
              hint={t('profile.edit.phoneHint')}
              value={phone}
              onChangeText={setPhone}
              prefix={<PhonePrefix />}
              keyboardType="phone-pad"
              autoComplete="tel"
              error={submitted ? phoneError : undefined}
            />
            {formError ? (
              <Text variant="caption" tone="invalid" accessibilityLiveRegion="polite">
                {formError}
              </Text>
            ) : null}
            <Button label={t('profile.edit.save')} onPress={save} loading={saving} />
          </View>
        </KeyboardAvoidingView>
      </ThemeScope>
    </Modal>
  );
}
