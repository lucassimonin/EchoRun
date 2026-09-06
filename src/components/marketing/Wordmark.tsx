/** Marque : trois ondes decroissantes + le nom. Aucun fichier image. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        aria-hidden="true"
        className="text-matcha-500"
      >
        <circle cx="4.5" cy="11" r="2.5" fill="currentColor" />
        <path
          d="M10 6.2a7.4 7.4 0 0 1 0 9.6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M15.2 3.4a12 12 0 0 1 0 15.2"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-charcoal">
          EchoRun
        </span>
      )}
    </span>
  );
}
