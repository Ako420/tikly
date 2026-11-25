export function FormHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-eyebrow font-bold tracking-[1.2px] text-accent-text uppercase">{eyebrow}</p>
      <h1 className="text-[28px] leading-8 font-extrabold tracking-[-0.7px] text-foreground sm:text-display sm:tracking-[-0.8px]">
        {title}
      </h1>
      <p className="text-body text-foreground-secondary">{subtitle}</p>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-32 rounded-full bg-surface" />
        <div className="h-9 w-56 rounded-xl bg-surface" />
        <div className="h-5 w-full rounded-full bg-surface" />
      </div>
      <div className="h-13 rounded-2xl bg-surface" />
      <div className="h-13 rounded-2xl bg-surface" />
      <div className="h-14 rounded-2xl bg-surface" />
    </div>
  );
}
