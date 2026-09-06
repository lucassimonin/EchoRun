import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

/** Carte de base : blanc casse, bord tres discret, ombre presque invisible. */
export function Surface({
  children,
  className,
  as: Tag = 'div',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside';
  padded?: boolean;
}) {
  return (
    <Tag
      className={cx(
        'rounded-card border border-charcoal/[0.07] bg-paper shadow-soft',
        padded && 'p-6',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cx(
        'text-[11px] font-semibold uppercase tracking-[0.16em] text-matcha-400',
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'matcha' | 'clay';
}) {
  const tones = {
    neutral: 'bg-charcoal/[0.05] text-charcoal-muted',
    matcha: 'bg-matcha-100 text-matcha-600',
    clay: 'bg-clay/10 text-clay',
  } as const;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.01em]',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx('border-0 border-t border-charcoal/[0.07]', className)} />;
}
