import { ButtonLink } from '@/components/ui/Button';
import { Wordmark } from '@/components/marketing/Wordmark';

export const metadata = { title: 'Hors connexion', robots: { index: false } };

/** Page servie par le service worker quand une navigation échoue sans réseau. */
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <div className="flex justify-center">
          <Wordmark />
        </div>
        <h1 className="mt-8 text-[26px] font-semibold tracking-[-0.03em] text-charcoal">
          Pas de connexion
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-charcoal-muted">
          Cette page a besoin du réseau. En revanche, si tu as préparé ta course à l’avance, l’écran
          de course fonctionne hors-ligne&nbsp;: tes vocaux sont déjà sur ton téléphone.
        </p>
        <ButtonLink href="/app" size="md" className="mt-8">
          Ouvrir mes courses
        </ButtonLink>
      </div>
    </main>
  );
}
