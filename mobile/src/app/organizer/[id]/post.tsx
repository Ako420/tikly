import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FieldBox } from '@/components/organizer/FieldBox';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { organizerApi } from '@/features/organizer/api';
import type { PostType } from '@/features/posts/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme';

const MAX_BODY = 600;
const TITLE_LENGTH = 80;
const TOPICS: { type: PostType; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { type: 'speaker', icon: 'person-add' },
  { type: 'update', icon: 'notifications' },
  { type: 'promo', icon: 'pricetag' },
];

const titleFrom = (body: string) => {
  const first = body.trim().split(/(?<=[.!?])\s|\n/)[0] ?? body.trim();
  return first.length > TITLE_LENGTH ? `${first.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : first;
};

export default function PostUpdate() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useMarketplaceFormat();
  const errorMessage = useApiErrorMessage();
  const event = useAsync(() => organizerApi.event(id), `event-${id}`).data;
  const holders = useAsync(() => organizerApi.stats(id), `stats-${id}`).data?.totals.ticketsSold ?? 0;
  const [type, setType] = useState<PostType>('update');
  const [body, setBody] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [speakerRole, setSpeakerRole] = useState('');
  const [image, setImage] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [notify, setNotify] = useState(true);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const bodyMissing = !body.trim();
  const speakerMissing = type === 'speaker' && !speakerName.trim();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    setError(undefined);
    try {
      setImage(await organizerApi.uploadImage(asset.uri, asset.mimeType ?? 'image/jpeg'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    setSubmitted(true);
    if (bodyMissing || speakerMissing) return;
    setSending(true);
    setError(undefined);
    const text = body.trim();
    const title = type === 'speaker' ? speakerName.trim() : titleFrom(text);
    try {
      const result = await organizerApi.createPost(id, {
        type,
        title: { [language]: title },
        body: { [language]: text },
        images: image ? [image] : [],
        notify: notify && holders > 0,
        ...(type === 'speaker' && { speaker: { name: speakerName.trim(), ...(speakerRole.trim() && { role: speakerRole.trim() }) } }),
      });
      Alert.alert(
        t('organizer.post.postedTitle'),
        result.notified > 0 ? t('organizer.post.postedNotified', { count: result.notified }) : t('organizer.post.postedBody'),
      );
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View className="h-[52px] flex-row items-center gap-3 px-6">
        <IconButton
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
          icon={<Ionicons name="close" size={20} color={colors.foreground} />}
        />
        <Text variant="eyebrow" tone="accent" numberOfLines={1} className="flex-1 text-center">
          {event ? format.text(event.title) : ''}
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-6 pb-6 pt-1">
          <Text variant="headline" accessibilityRole="header">
            {t('organizer.post.title')}
          </Text>

          <View className="gap-2">
            <Text variant="bodySmStrong">{t('organizer.post.about')}</Text>
            <View accessibilityRole="radiogroup" className="flex-row gap-2.5">
              {TOPICS.map((topic) => {
                const active = topic.type === type;
                return (
                  <Pressable
                    key={topic.type}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setType(topic.type)}
                    className={cn('h-16 flex-1 items-center justify-center gap-1 rounded-2xl', active ? 'bg-accent' : 'border border-border bg-surface-raised')}
                  >
                    <Ionicons name={topic.icon} size={20} color={active ? colors.onAccent : colors.accentText} />
                    <Text variant="label" tone={active ? 'onAccent' : 'primary'}>
                      {t(`organizer.post.types.${topic.type}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {type === 'speaker' ? (
            <View className="flex-row gap-2.5">
              <FieldBox
                className="flex-1"
                value={speakerName}
                onChangeText={setSpeakerName}
                placeholder={t('organizer.post.speakerName')}
                maxLength={100}
                error={submitted && speakerMissing}
              />
              <FieldBox className="flex-1" value={speakerRole} onChangeText={setSpeakerRole} placeholder={t('organizer.post.speakerRole')} maxLength={150} />
            </View>
          ) : null}

          <View>
            <FieldBox
              multiline
              highlighted
              value={body}
              onChangeText={setBody}
              maxLength={MAX_BODY}
              placeholder={t(`organizer.post.placeholders.${type}`)}
              error={submitted && bodyMissing}
              className="min-h-[130px] pb-8"
            />
            <Text variant="captionSm" tone="muted" className="absolute bottom-3 right-4">
              {`${body.length} / ${MAX_BODY}`}
            </Text>
          </View>

          {image || uploading ? (
            <View className="h-[150px] overflow-hidden rounded-[22px] bg-surface">
              {image ? <Image source={{ uri: image }} className="absolute inset-0" /> : null}
              {uploading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator color={colors.accentText} />
                </View>
              ) : (
                <View className="absolute right-3 top-3">
                  <IconButton
                    accessibilityLabel={t('organizer.post.removePhoto')}
                    onPress={() => setImage(undefined)}
                    icon={<Ionicons name="close" size={18} color={colors.foreground} />}
                  />
                </View>
              )}
            </View>
          ) : null}

          <Button
            variant="outline"
            size="md"
            label={image ? t('organizer.post.changePhoto') : t('organizer.post.addPhoto')}
            icon={<Ionicons name="image" size={18} color={colors.accentText} />}
            onPress={pickImage}
            disabled={uploading}
          />

          {error ? (
            <Text variant="bodySm" tone="invalid" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="gap-3 border-t border-border bg-surface-raised px-6 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        {holders > 0 ? (
          <View className="flex-row items-center justify-between">
            <Text variant="bodySm" tone="secondary">
              {t('organizer.post.notify', { count: holders })}
            </Text>
            <Switch
              value={notify}
              onValueChange={setNotify}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.surfaceRaised}
              accessibilityLabel={t('organizer.post.notify', { count: holders })}
            />
          </View>
        ) : null}
        <Button label={t('organizer.post.send')} loading={sending} onPress={send} />
      </View>
    </Screen>
  );
}
