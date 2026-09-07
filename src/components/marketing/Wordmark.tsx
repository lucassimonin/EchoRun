/** Marque : pastille orange bordée + le nom en capitales grasses. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-md border-[3px] border-black bg-orange text-white shadow-[2px_2px_0_0_#000]">
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="4.5" cy="11" r="2.6" fill="currentColor" />
          <path
            d="M10 6.2a7.4 7.4 0 0 1 0 9.6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M15.2 3.4a12 12 0 0 1 0 15.2"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-[20px] font-bold uppercase tracking-[-0.02em] text-black">
          EchoRun
        </span>
      )}
    </span>
  );
}
