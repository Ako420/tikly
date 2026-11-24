import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/brand/Logo';
import { OnboardingSlide, type ImageCredit } from '@/components/onboarding/OnboardingSlide';
import { PaymentPreview } from '@/components/payments/PaymentPreview';
import { QrTicketPreview } from '@/components/tickets/QrTicketPreview';
import { TicketPreview } from '@/components/tickets/TicketPreview';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { PagerDots } from '@/components/ui/PagerDots';
import { useTranslation } from '@/i18n/I18nProvider';
import { ThemeScope } from '@/theme';

type SlideKey = 'discover' | 'pay' | 'entry';

type Slide = {
  key: SlideKey;
  image: ImageSourcePropType;
  credit?: ImageCredit;
};

const WELCOME_PHOTO: ImageSourcePropType = require('../../assets/images/events/cimfest-1.jpg');

const WELCOME_CREDIT: ImageCredit = {
  label: 'Photo: Kekiwiyi · CC BY-SA 4.0',
  url: 'https://commons.wikimedia.org/wiki/File:Asaba_at_CIMFEST.jpg',
};

const slides: Slide[] = [
  {
    key: 'discover',
    image: WELCOME_PHOTO,
    credit: WELCOME_CREDIT,
  },
  {
    key: 'pay',
    image: WELCOME_PHOTO,
    credit: WELCOME_CREDIT,
  },
  {
    key: 'entry',
    image: WELCOME_PHOTO,
    credit: WELCOME_CREDIT,
  },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const previews: Record<SlideKey, ReactNode> = {
    discover: (
      <TicketPreview
        eyebrow={t('onboarding.discover.ticket.eyebrow')}
        title={t('onboarding.discover.ticket.title')}
        venue={t('onboarding.discover.ticket.venue')}
        tier={t('tickets.tiers.standard')}
        price={2000}
        className="-rotate-3"
      />
    ),
    pay: (
      <PaymentPreview
        title={t('onboarding.pay.card.title')}
        meta={t('onboarding.pay.card.meta')}
        amount={30000}
        holdLabel={t('onboarding.pay.card.holdLabel')}
        holdValue="09:42"
        className="rotate-2"
      />
    ),
    entry: (
      <QrTicketPreview
        status={t('onboarding.entry.card.status')}
        title={t('onboarding.entry.card.title')}
        meta={t('onboarding.entry.card.meta')}
        className="-rotate-2"
      />
    ),
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex((current) => (current === next ? current : Math.min(Math.max(next, 0), slides.length - 1)));
    },
    [width],
  );

  const goTo = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(slide) => slide.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <OnboardingSlide
            width={width}
            image={item.image}
            credit={item.credit}
            eyebrow={t(`onboarding.${item.key}.eyebrow`)}
            title={t(`onboarding.${item.key}.title`)}
            body={t(`onboarding.${item.key}.body`)}
            preview={previews[item.key]}
          />
        )}
      />
      <ThemeScope
        scheme="dark"
        className="absolute left-0 right-0 h-12 flex-row items-center justify-between px-6"
        style={{ top: insets.top }}
      >
        <Logo />
        <LanguageToggle />
      </ThemeScope>
      <View className="gap-6 px-6 pt-6" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <PagerDots
          count={slides.length}
          active={activeIndex}
          onSelect={goTo}
          getLabel={(index) => t(`onboarding.${slides[index].key}.eyebrow`)}
        />
        <View className="gap-3">
          <Button label={t('onboarding.getStarted')} onPress={() => router.push('/sign-up')} />
          <Button label={t('onboarding.haveAccount')} variant="outline" onPress={() => router.push('/login')} />
        </View>
      </View>
    </View>
  );
}
