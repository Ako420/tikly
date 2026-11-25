'use client';

import { buttonClass } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { useProvider } from './ProviderShell';

const greetingKey = (hour: number) => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

export function OverviewScreen() {
  const { user, locale, t, profile, profileLoading, pendingRequests } = useProvider();
  const copy = t.provider.overview;
  const now = new Date();
  const firstName = user.name.split(' ')[0] ?? '';
  const today = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-fg-secondary first-letter:uppercase">{today}</p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight">
            {copy[greetingKey(now.getHours())].replace('{name}', firstName)}
          </h1>
        </div>
        <button type="button" disabled title={t.shell.comingSoon} className={buttonClass('primary', 'md')}>
          <Icon name="add" size={18} />
          {copy.addService}
        </button>
      </header>

      {profileLoading ? (
        <div className="h-32 animate-pulse rounded-[18px] bg-raised" />
      ) : !profile ? (
        <Notice icon="business" tone="warning" title={copy.setupTitle} body={copy.setupBody} />
      ) : pendingRequests > 0 ? (
        <Notice
          icon="bookings"
          tone="accent"
          title={
            pendingRequests === 1 ? copy.requestTitle : copy.requestsTitle.replace('{count}', String(pendingRequests))
          }
          body={copy.requestsBody}
        />
      ) : null}

      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary-subtle text-primary">
          <Icon name="dashboard" size={26} />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight">{copy.emptyTitle}</h2>
        <p className="max-w-md text-[15px] text-fg-secondary">{copy.emptyBody}</p>
      </Card>
    </div>
  );
}

const NOTICE_TONES = {
  warning: 'border-warning/40 bg-warning-subtle text-warning-text',
  accent: 'border-accent/50 bg-accent/15 text-fg',
};

type NoticeProps = { icon: IconName; tone: keyof typeof NOTICE_TONES; title: string; body: string };

function Notice({ icon, tone, title, body }: NoticeProps) {
  return (
    <section className={`flex items-start gap-4 rounded-[18px] border p-5 ${NOTICE_TONES[tone]}`}>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-raised text-fg">
        <Icon name={icon} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-[17px] font-extrabold text-fg">{title}</h2>
        <p className="text-[15px] text-fg-secondary">{body}</p>
      </div>
    </section>
  );
}
