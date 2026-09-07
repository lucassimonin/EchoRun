'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge, Surface } from '@/components/ui/Surface';

interface UnlockCardProps {
  raceId: string;
  count: number;
  freeCap: number;
  unlockedCap: number;
  unlocked: boolean;
  priceLabel: string;
}

/**
 * Modèle « le coureur paie ». Les proches déposent gratuitement jusqu'à
 * `freeCap` messages ; au-delà, le coureur débloque jusqu'à `unlockedCap`.
 * Ce composant montre l'état et lance le paiement Stripe.
 */
export function UnlockCard({
  raceId,
  count,
  freeCap,
  unlockedCap,
  unlocked,
  priceLabel,
}: UnlockCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

  // Retour de Stripe : le webhook a pu arriver avant ou après la redirection.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('unlocked') === '1') {
      setJustUnlocked(true);
      url.searchParams.delete('unlocked');
      window.history.replaceState({}, '', url.toString());
      const t = setTimeout(() => router.refresh(), 1500);
      return () => clearTimeout(t);
    }
  }, [router]);

  const cap = unlocked ? unlockedCap : freeCap;
  const remaining = Math.max(cap - count, 0);
  const pct = Math.min(100, Math.round((count / Math.max(cap, 1)) * 100));
  const capReached = count >= cap;

  const unlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/races/' + raceId + '/unlock', { method: 'POST' });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError(json.error ?? 'Le paiement est momentanément indisponible.');
    } catch {
      setError('Le paiement est momentanément indisponible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[16px] font-bold uppercase tracking-[-0.01em] text-charcoal">
          Messages de la course
        </h2>
        {unlocked ? (
          <Badge tone="matcha">Débloquée</Badge>
        ) : capReached ? (
          <Badge tone="clay">Plafond atteint</Badge>
        ) : (
          <Badge tone="matcha">Offert</Badge>
        )}
      </div>

      <p className="mt-3 text-[14px] text-charcoal">
        <strong className="font-bold">
          {count} / {cap}
        </strong>{' '}
        messages · tes proches ne paient jamais rien.
      </p>

      {/* Barre de progression */}
      <div className="mt-3 h-3 overflow-hidden rounded-md border-2 border-black bg-white">
        <div
          className={
            'h-full transition-all duration-500 ' +
            (capReached ? 'bg-danger' : 'bg-orange')
          }
          style={{ width: pct + '%' }}
        />
      </div>

      {justUnlocked ? (
        <div className="mt-4 rounded-lg border-[3px] border-black bg-neon px-4 py-3 text-[13.5px] font-bold text-black">
          Paiement confirmé&nbsp;! Ta course accepte désormais jusqu’à {unlockedCap} messages.
        </div>
      ) : null}

      {!unlocked ? (
        <>
          <p className="mt-4 text-[13.5px] leading-relaxed text-charcoal-muted">
            {capReached
              ? 'Tes proches ont rempli les ' +
                freeCap +
                ' messages offerts. Débloque la course pour en recevoir jusqu’à ' +
                unlockedCap +
                ' au total.'
              : 'Il reste ' +
                remaining +
                ' message' +
                (remaining > 1 ? 's' : '') +
                ' offert' +
                (remaining > 1 ? 's' : '') +
                '. Tu peux débloquer dès maintenant pour monter jusqu’à ' +
                unlockedCap +
                ' au total.'}
          </p>
          <Button
            fullWidth
            size="md"
            className="mt-4 min-h-12 !h-auto py-3 !whitespace-normal text-center leading-tight"
            disabled={busy}
            onClick={() => void unlock()}
          >
            {busy
              ? 'Redirection…'
              : 'Débloquer jusqu’à ' + unlockedCap + ' messages · ' + priceLabel}
          </Button>
          {error ? <p className="mt-3 text-[13px] text-clay">{error}</p> : null}
        </>
      ) : (
        <p className="mt-4 text-[13.5px] leading-relaxed text-charcoal-muted">
          Course débloquée&nbsp;: tes proches peuvent déposer jusqu’à {unlockedCap} messages en
          tout.
        </p>
      )}
    </Surface>
  );
}
