import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/marketing/LanguageSwitcher';
import { Wordmark } from '@/components/marketing/Wordmark';

export function SiteHeader() {
  const t = useTranslations('Nav');
  const nav = [
    { href: '/comment-ca-marche', label: t('howItWorks') },
    { href: '/confidentialite', label: t('privacy') },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-black bg-yellow pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" aria-label="EchoRun, accueil">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border-2 border-transparent px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-black transition-colors hover:border-black hover:bg-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg border-[3px] border-black bg-black px-5 text-[12px] font-bold uppercase tracking-[0.04em] text-yellow shadow-[4px_4px_0_0_#000] transition-colors duration-150 hover:bg-orange hover:text-black active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            {t('login')}
          </Link>
        </div>
      </div>
    </header>
  );
}
