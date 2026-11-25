import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/brand/Logo';
import { OnboardingDeck } from '@/components/onboarding/OnboardingDeck';
import { PaymentPreview } from '@/components/payments/PaymentPreview';
import { QrTicketPreview } from '@/components/tickets/QrTicketPreview';
import { TicketPreview } from '@/components/tickets/TicketPreview';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { PagerDots } from '@/components/ui/PagerDots';
import { Text } from '@/components/ui/Text';
import { useRedirectIfSignedIn } from '@/features/auth/useRedirectIfSignedIn';
import { useTranslation } from '@/i18n/I18nProvider';
import { DURATION, EASE_OUT } from '@/lib/motion';

type SlideKey = 'discover' | 'pay' | 'entry';

type Slide = {
  key: SlideKey;
  image: ImageSourcePropType;
};

const AUTOPLAY_INTERVAL_MS = 4000;
const CARD_MAX_WIDTH = 364;
const CARD_RATIO = 1.25;
const DECK_PEEK_SPACE = 52;

const slides: Slide[] = [
  { key: 'discover', image: require('../../assets/images/onboarding/discover.jpg') },
  { key: 'pay', image: require('../../assets/images/onboarding/pay.jpg') },
  { key: 'entry', image: require('../../assets/images/onboarding/entry.jpg') },
];

const copyEntering = FadeInDown.duration(DURATION.slow).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

export default function Onboarding() {
  const { t } = useTranslation();
  useRedirectIfSignedIn();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [deckArea, setDeckArea] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setActiveIndex((current) => (current + 1) % slides.length), AUTOPLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  const previews: Record<SlideKey, ReactNode> = {
    discover: (
      <TicketPreview
        eyebrow={t('onboarding.discover.ticket.eyebrow')}
        title={t('onboarding.discover.ticket.title')}
        venue={t('onboarding.discover.ticket.venue')}
        tier={t('tickets.tiers.standard')}
        price={2000}
      />
    ),
    pay: (
      <PaymentPreview
        title={t('onboarding.pay.card.title')}
        meta={t('onboarding.pay.card.meta')}
        amount={30000}
        holdLabel={t('onboarding.pay.card.holdLabel')}
        holdValue="09:42"
      />
    ),
    entry: (
      <QrTicketPreview
        status={t('onboarding.entry.card.status')}
        title={t('onboarding.entry.card.title')}
        meta={t('onboarding.entry.card.meta')}
      />
    ),
  };

  const advance = useCallback(() => setActiveIndex((current) => (current + 1) % slides.length), []);

  const onDeckLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDeckArea({ width, height });
  };

  const cardWidth = Math.min(deckArea.width - 36, CARD_MAX_WIDTH);
  const cardHeight = Math.min(deckArea.height - DECK_PEEK_SPACE, cardWidth * CARD_RATIO);
  const active = slides[activeIndex];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="h-12 flex-row items-center justify-between px-6">
        <Logo />
        <LanguageToggle />
      </View>

      <Animated.View key={active.key} entering={copyEntering} className="min-h-[132px] items-center gap-2.5 px-7 pt-5">
        <Text variant="display" className="text-center" accessibilityRole="header">
          {t(`onboarding.${active.key}.title`)}
        </Text>
        <Text tone="secondary" className="text-center">
          {t(`onboarding.${active.key}.body`)}
        </Text>
      </Animated.View>

      <View className="flex-1 items-center justify-center" onLayout={onDeckLayout}>
        {cardWidth > 0 && cardHeight > 0 ? (
          <OnboardingDeck
            active={activeIndex}
            width={cardWidth}
            height={cardHeight}
            onAdvance={advance}
            cards={slides.map((slide) => ({
              key: slide.key,
              image: slide.image,
              label: t(`onboarding.${slide.key}.eyebrow`),
              preview: previews[slide.key],
            }))}
          />
        ) : null}
      </View>

      <View className="items-center gap-5 px-6 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <PagerDots
          count={slides.length}
          active={activeIndex}
          onSelect={setActiveIndex}
          getLabel={(index) => t(`onboarding.${slides[index].key}.eyebrow`)}
        />
        <View className="w-full gap-3">
          <Button label={t('onboarding.getStarted')} onPress={() => router.push('/sign-up')} />
          <Button label={t('onboarding.haveAccount')} variant="outline" onPress={() => router.push('/login')} />
        </View>
      </View>
    </View>
  );
}
