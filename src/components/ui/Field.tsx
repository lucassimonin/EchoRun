import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/utils';

const CONTROL =
  'w-full rounded-2xl border border-charcoal/10 bg-paper px-4 text-[15px] text-charcoal ' +
  'placeholder:text-charcoal-faint/70 transition-colors duration-200 ' +
  'hover:border-charcoal/20 focus:border-matcha-400 focus:outline-none focus:ring-4 focus:ring-matcha-500/10';

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium tracking-[-0.005em] text-charcoal"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12.5px] text-clay">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] leading-relaxed text-charcoal-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(CONTROL, 'h-12', className)} {...props} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="space-y-0.5">
        <label htmlFor={id} className="block text-[14px] font-medium text-charcoal">
          {label}
        </label>
        {description ? (
          <p className="max-w-md text-[12.5px] leading-relaxed text-charcoal-faint">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-matcha-500' : 'bg-charcoal/15',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 size-5 rounded-full bg-paper shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
