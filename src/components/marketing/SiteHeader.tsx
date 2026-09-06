import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Wordmark } from '@/components/marketing/Wordmark';

const NAV = [
  { href: '/comment-ca-marche', label: 'Comment ca marche' },
  { href: '/confidentialite', label: 'Confidentialite' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-charcoal/[0.06] bg-bone/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="EchoRun, accueil">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[13.5px] text-charcoal-muted transition-colors hover:bg-charcoal/[0.04] hover:text-charcoal"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-3.5 py-2 text-[13.5px] text-charcoal-muted transition-colors hover:text-charcoal sm:block"
          >
            Se connecter
          </Link>
          <ButtonLink href="/login" size="sm">
            Creer ma course
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
