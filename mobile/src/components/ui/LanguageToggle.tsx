import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';
import { useTranslation, type Language } from '@/i18n/I18nProvider';
import { Text } from './Text';

const languages: Language[] = ['en', 'fr'];

export function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('common.language')}
      className="flex-row items-center rounded-full border border-border-subtle bg-background p-[3px]"
    >
      {languages.map((option) => {
        const active = option === language;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => setLanguage(option)}
            hitSlop={6}
            className={cn('h-[30px] items-center justify-center rounded-full px-3', active && 'bg-foreground')}
          >
            <Text variant="label" tone={active ? 'inverse' : 'primary'}>
              {option.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
