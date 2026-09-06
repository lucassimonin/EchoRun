import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] rounded-full ' +
  'transition-[transform,background-color,border-color,opacity] duration-200 ' +
  'active:scale-[0.985] disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-matcha-500 text-bone hover:bg-matcha-600 shadow-soft',
  dark: 'bg-charcoal text-bone hover:bg-charcoal/90 shadow-soft',
  secondary:
    'bg-paper text-charcoal border border-charcoal/10 hover:border-charcoal/20 hover:bg-bone-100 shadow-soft',
  ghost: 'text-charcoal-muted hover:text-charcoal hover:bg-charcoal/5',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-7 text-[15px]',
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
