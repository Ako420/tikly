'use client';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { providerApi } from '@/features/provider/api';
import { fill, formatDate } from '@/features/provider/format';
import { cn } from '@/lib/cn';
import { useAsync } from '@/lib/useAsync';
import { EmptyState, LoadError, PageHeader, ProfileRequired, Skeleton } from './parts';
import { useProvider } from './ProviderShell';

const loadReviews = (providerId: string | undefined, verified: boolean) =>
  providerId && verified ? providerApi.reviews(providerId) : Promise.resolve([]);

export function ReviewsScreen() {
  const { t, locale, profile, profileLoading } = useProvider();
  const copy = t.providerPages.reviews;
  const verified = profile?.verification === 'verified';
  const reviews = useAsync(() => loadReviews(profile?.id, verified), [profile?.id, verified]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      {profileLoading ? (
        <Skeleton />
      ) : !profile ? (
        <ProfileRequired />
      ) : !verified ? (
        <EmptyState icon="reviews" text={copy.notVerified} />
      ) : (
        <>
          <Card className="flex items-center gap-5 p-5">
            <p className="text-[44px] leading-none font-extrabold tracking-tight">
              {profile.ratingCount > 0 ? profile.ratingAvg.toFixed(1) : '–'}
            </p>
            <div className="flex flex-col gap-1">
              <Stars rating={profile.ratingAvg} />
              <p className="text-[15px] text-fg-secondary">
                {profile.ratingCount === 1 ? copy.one : fill(copy.count, { count: profile.ratingCount })}
              </p>
            </div>
          </Card>

          {reviews.loading && !reviews.data ? (
            <Skeleton />
          ) : reviews.error && !reviews.data ? (
            <LoadError onRetry={reviews.reload} />
          ) : (reviews.data ?? []).length === 0 ? (
            <EmptyState icon="reviews" text={copy.empty} />
          ) : (
            <ul className="flex flex-col gap-3">
              {(reviews.data ?? []).map((review) => (
                <li key={review.id}>
                  <Card className="flex flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">{review.author}</p>
                      <p className="text-sm text-fg-secondary">
                        {formatDate(review.createdAt, locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <Stars rating={review.rating} label={fill(copy.average, { rating: review.rating })} />
                    {review.comment ? <p className="text-[15px]">{review.comment}</p> : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={label ?? rating.toFixed(1)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Icon
          key={value}
          name="star"
          size={18}
          className={cn(value <= Math.round(rating) ? 'fill-accent text-accent' : 'text-border')}
        />
      ))}
    </span>
  );
}
