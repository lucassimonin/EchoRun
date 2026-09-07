import Link from 'next/link';
import { ManageCookiesButton } from '@/components/consent/ManageCookiesButton';
import { Wordmark } from '@/components/marketing/Wordmark';

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { href: '/comment-ca-marche', label: 'Comment ça marche' },
      { href: '/login', label: 'Créer une course' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { href: '/confidentialite', label: 'Politique de confidentialité' },
      { href: '/mentions-legales', label: 'Mentions légales' },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  const contact = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? 'lsimonin2@gmail.com';

  return (
    <footer className="border-t-[3px] border-black bg-off">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-xs text-[13px] leading-relaxed text-charcoal-faint">
            Les encouragements de tes proches, déclenchés par le GPS aux points exacts de ton
            parcours.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-orange">
              {column.title}
            </p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] font-medium text-charcoal-muted transition-colors hover:text-black"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t-2 border-black/15 px-5 py-6 text-[12px] text-charcoal-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {year} EchoRun. Tous droits réservés.</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* Le retrait du consentement doit être aussi simple que le consentement. */}
          <ManageCookiesButton />
          <a href={'mailto:' + contact} className="transition-colors hover:text-black">
            {contact}
          </a>
        </div>
      </div>
    </footer>
  );
}
