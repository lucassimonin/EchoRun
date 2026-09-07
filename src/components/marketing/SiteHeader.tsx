import Link from 'next/link';
import { Wordmark } from '@/components/marketing/Wordmark';

const NAV = [
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/confidentialite', label: 'Confidentialité' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-black bg-yellow">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="EchoRun, accueil">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border-2 border-transparent px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-black transition-colors hover:border-black hover:bg-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-lg border-[3px] border-black bg-black px-5 text-[12px] font-bold uppercase tracking-[0.04em] text-yellow shadow-[4px_4px_0_0_#000] transition-colors duration-150 hover:bg-orange hover:text-black active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          Se connecter
        </Link>
      </div>
    </header>
  );
}
