import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

/** Carte brutaliste : blanc cassé, bord noir 3px, ombre dure. */
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
        'rounded-lg border-[3px] border-black bg-paper shadow-[4px_4px_0_0_#000]',
        padded && 'p-6',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Surtitre : mono, capitales, orange. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cx(
        'font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-orange',
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Badge fluo à bord noir. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'matcha' | 'clay';
}) {
  const tones = {
    neutral: 'bg-white text-black',
    matcha: 'bg-neon text-black',
    clay: 'bg-danger text-white',
  } as const;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border-2 border-black px-2.5 py-0.5 ' +
          'text-[11px] font-bold uppercase tracking-[0.04em]',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx('border-0 border-t-2 border-black/15', className)} />;
}
