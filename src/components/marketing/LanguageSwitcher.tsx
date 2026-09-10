'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cx } from '@/lib/utils';

/** Bascule FR / EN, en conservant la page courante. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations('LangSwitcher');
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className={cx(
        'inline-flex overflow-hidden rounded-md border-2 border-black',
        className,
      )}
      role="group"
      aria-label={t('label')}
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          onClick={() => {
            if (l !== locale) router.replace(pathname, { locale: l });
          }}
          className={cx(
            'px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors',
            l === locale ? 'bg-black text-yellow' : 'bg-white text-black hover:bg-neon',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
