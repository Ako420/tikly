import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/features/auth/FormHeading";
import { GoogleAuthGate } from "@/features/auth/GoogleAuth";
import { LoginForm } from "@/features/auth/LoginForm";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const [{ t, locale }, { next }] = await Promise.all([getDictionary(), searchParams]);
  const nextPath = typeof next === "string" ? next : undefined;
  return (
    <GoogleAuthGate t={t} next={nextPath}>
      <LoginForm t={t} locale={locale} next={nextPath} />
    </GoogleAuthGate>
  );
}
