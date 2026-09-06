import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { Eyebrow } from '@/components/ui/Surface';

/** Gabarit commun aux pages éditoriales (exigence de contenu AdSense). */
export function ContentPage({
  eyebrow,
  title,
  lede,
  updatedAt,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  updatedAt?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-8 pt-16 sm:px-8 sm:pt-20">
        <header className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.032em] text-charcoal">
            {title}
          </h1>
          {lede ? <p className="mt-5 max-w-2xl text-lede text-charcoal-muted">{lede}</p> : null}
          {updatedAt ? (
            <p className="mt-6 text-[12.5px] text-charcoal-faint">
              Dernière mise à jour&nbsp;: {updatedAt}
            </p>
          ) : null}
        </header>

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="prose-echo">{children}</div>
          {aside ? <aside className="space-y-4 lg:pt-2">{aside}</aside> : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
