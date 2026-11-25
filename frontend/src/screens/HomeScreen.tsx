import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export function HomeScreen() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-surface px-4 py-16 text-center">
      <Logo />
      <h1 className="max-w-xl text-4xl font-extrabold tracking-tight sm:text-5xl">Plan it, sell it, run the gate.</h1>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/sign-in" className={buttonClass('outline', 'md')}>
          Log in
        </Link>
        <Link href="/sign-up?role=organizer" className={buttonClass('primary', 'md')}>
          Start organizing
        </Link>
      </div>
    </main>
  );
}
