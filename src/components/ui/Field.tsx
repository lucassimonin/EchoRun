import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/utils';

const CONTROL =
  'w-full rounded-lg border-[3px] border-black bg-white px-4 text-[15px] text-black ' +
  'placeholder:text-black/35 transition-shadow duration-100 ' +
  'focus:outline-none focus:shadow-[3px_3px_0_0_#000]';

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
        className="block text-[12px] font-bold uppercase tracking-[0.04em] text-black"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="font-mono text-[12px] text-danger">{error}</p>
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
        <label htmlFor={id} className="block text-[14px] font-bold text-black">
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
          'relative mt-0.5 h-7 w-12 shrink-0 rounded-md border-[3px] border-black transition-colors duration-150',
          checked ? 'bg-neon' : 'bg-white',
        )}
      >
        <span
          className={cx(
            'absolute top-[2px] size-[18px] rounded-[3px] border-2 border-black bg-black transition-transform duration-150',
            checked ? 'translate-x-[20px]' : 'translate-x-[2px]',
          )}
        />
      </button>
    </div>
  );
}
