import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.02em] ' +
  'rounded-lg transition-[transform,box-shadow,background-color,color] duration-100 ' +
  'disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap';

/* Effet "pression" : la carte s'enfonce et l'ombre disparaît au clic. */
const HARD =
  'border-[3px] border-black shadow-[4px_4px_0_0_#000] ' +
  'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none';

const VARIANTS: Record<Variant, string> = {
  primary: HARD + ' bg-orange text-black hover:bg-orange-dark hover:text-white',
  dark: HARD + ' bg-black text-yellow hover:bg-[#141414]',
  secondary: HARD + ' bg-off text-black hover:bg-yellow',
  ghost:
    'text-black underline decoration-orange decoration-[3px] underline-offset-4 ' +
    'hover:decoration-black active:translate-y-[1px]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-4 text-[12px]',
  md: 'h-12 px-6 text-[13px]',
  lg: 'h-14 px-8 text-[15px]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & ComponentProps<'button'>) {
  return (
    <button
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </Link>
  );
}
