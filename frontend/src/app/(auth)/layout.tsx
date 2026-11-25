import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Logo } from "@/components/ui/Logo";
import { getDictionary } from "@/i18n/server";
import cimfestPhoto from "../../../public/images/auth-cimfest.jpg";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1 bg-background">
      <aside className="sticky top-0 hidden h-dvh w-[44%] max-w-[640px] shrink-0 self-start flex-col justify-between overflow-hidden bg-media p-10 lg:flex">
        <div className="absolute inset-0">
          <Image
            src={cimfestPhoto}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 44vw, 0px"
            className="object-cover"
            placeholder="blur"
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(20,10,69,0.55)_0%,rgba(20,10,69,0.15)_35%,rgba(20,10,69,0.92)_100%)]" />
        </div>
        <Link href="/" className="relative w-fit">
          <Logo tone="media" />
        </Link>
        <Suspense>
          <BrandMessage />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-10 sm:py-10">
        <header className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <Suspense fallback={<div className="h-9" />}>
            <LocaleSwitch />
          </Suspense>
        </header>
        <main className="flex w-full max-w-[420px] flex-1 flex-col justify-center self-center py-10">{children}</main>
        <Suspense>
          <GateNote />
        </Suspense>
      </div>
    </div>
  );
}

async function BrandMessage() {
  const { t } = await getDictionary();
  return (
    <div className="relative flex max-w-[560px] flex-col gap-4">
      <p className="text-eyebrow font-bold tracking-[1.2px] text-accent uppercase">{t.brand.eyebrow}</p>
      <h2 className="text-[44px] leading-[48px] font-extrabold tracking-[-1.6px] text-on-media">{t.brand.headline}</h2>
      <p className="text-body text-violet-100">{t.brand.supporting}</p>
    </div>
  );
}

async function LocaleSwitch() {
  const { locale, t } = await getDictionary();
  return <LanguagePicker locale={locale} label={t.languageLabel} />;
}

async function GateNote() {
  const { t } = await getDictionary();
  return (
    <footer className="flex items-center justify-center gap-2 text-center text-caption text-foreground-secondary">
      <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path strokeLinecap="round" d="M10.5 5h3" />
      </svg>
      {t.brand.gateNote}
    </footer>
  );
}
