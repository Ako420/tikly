import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui/Logo";
import { logout } from "@/features/auth/actions";
import { getSessionUser } from "@/features/auth/session";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-4 sm:px-10">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense>
          <Welcome />
        </Suspense>
      </main>
    </div>
  );
}

async function Welcome() {
  const [user, { t }] = await Promise.all([getSessionUser(), getDictionary()]);
  if (!user) redirect("/login");
  if (user.role === "organizer") redirect("/organizer");
  if (user.role === "admin") redirect("/admin");

  return (
    <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-background p-8 text-center">
      <p className="text-eyebrow font-bold tracking-[1.2px] text-accent-text uppercase">{user.role}</p>
      <h1 className="text-[28px] leading-8 font-extrabold tracking-[-0.7px]">
        {t.dashboard.greeting.replace("{name}", user.name)}
      </h1>
      <p className="text-body text-foreground-secondary">{t.dashboard.comingSoon}</p>
      <form action={logout}>
        <button
          type="submit"
          className="mt-2 h-11 rounded-2xl border-[1.5px] border-outline px-5 text-body-sm font-semibold hover:bg-surface"
        >
          {t.dashboard.signOut}
        </button>
      </form>
    </section>
  );
}
