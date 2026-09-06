import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './LoginForm';
import { Wordmark } from '@/components/marketing/Wordmark';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connecte-toi a EchoRun pour creer une course et partager ton parcours.',
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Link href="/" aria-label="EchoRun">
            <Wordmark />
          </Link>
        </div>

        <h1 className="mt-10 text-center text-[26px] font-semibold tracking-[-0.03em] text-charcoal">
          Créer ou retrouver ma course
        </h1>
        <p className="mt-3 text-center text-[14px] leading-relaxed text-charcoal-muted">
          Pas de mot de passe. On t’envoie un lien à usage unique par e-mail.
        </p>

        <div className="mt-8">
          <LoginForm next={typeof next === 'string' ? next : undefined} />
        </div>

        <p className="mt-8 text-center text-[11.5px] leading-relaxed text-charcoal-faint">
          En continuant, tu acceptes les{' '}
          <Link href="/mentions-legales" className="underline underline-offset-2">
            conditions d’utilisation
          </Link>{' '}
          et la{' '}
          <Link href="/confidentialite" className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
