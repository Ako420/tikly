import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/features/auth/FormHeading";
import { GoogleAuthGate } from "@/features/auth/GoogleAuth";
import { SignupForm } from "@/features/auth/SignupForm";
import { isWebSignupRole } from "@/features/auth/types";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SignupContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupContent({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  const [{ t, locale }, { role }] = await Promise.all([getDictionary(), searchParams]);
  return (
    <GoogleAuthGate t={t}>
      <SignupForm t={t} locale={locale} initialRole={isWebSignupRole(role) ? role : undefined} />
    </GoogleAuthGate>
  );
}
