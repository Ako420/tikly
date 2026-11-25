import { View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n/I18nProvider';

function CardSkeleton({ image }: { image: string }) {
  return (
    <View className="flex-row items-center gap-3.5 rounded-card border border-border bg-surface-raised p-2.5">
      <Skeleton className={`${image} rounded-xl`} />
      <View className="flex-1 gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
      </View>
    </View>
  );
}

export function EventListSkeleton({ count = 3, variant = 'row' }: { count?: number; variant?: 'row' | 'result' }) {
  const { t } = useTranslation();
  return (
    <View className="gap-3" accessible accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} image={variant === 'row' ? 'h-[76px] w-[76px]' : 'h-[92px] w-[92px]'} />
      ))}
    </View>
  );
}

export function FeaturedSkeleton({ width }: { width: number }) {
  return <Skeleton className="h-[218px] rounded-card" style={{ width }} />;
}

export function EventDetailsSkeleton() {
  const { t } = useTranslation();
  return (
    <View className="flex-1" accessible accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
      <Skeleton className="h-[345px] rounded-none" />
      <View className="gap-4 px-6 pt-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <View className="gap-3 pt-2">
          {[0, 1].map((index) => (
            <View key={index} className="flex-row items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </View>
            </View>
          ))}
        </View>
        <Skeleton className="mt-2 h-5 w-28" />
        <Skeleton className="h-[72px] rounded-card" />
        <Skeleton className="h-[72px] rounded-card" />
      </View>
    </View>
  );
}
