'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Badge, Surface } from '@/components/ui/Surface';
import { trackEvent } from '@/lib/analytics';

interface UnlockCardProps {
  raceId: string;
  count: number;
  freeCap: number;
  unlockedCap: number;
  unlocked: boolean;
  priceLabel: string;
  priceCents: number;
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
  priceCents,
}: UnlockCardProps) {
  const router = useRouter();
  const t = useTranslations('UnlockCard');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

  // Retour de Stripe : le webhook a pu arriver avant ou après la redirection.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('unlocked') === '1') {
      setJustUnlocked(true);
      trackEvent('purchase', { value: priceCents / 100, currency: 'EUR', item: 'race_unlock' });
      url.searchParams.delete('unlocked');
      window.history.replaceState({}, '', url.toString());
      const timer = setTimeout(() => router.refresh(), 1500);
      return () => clearTimeout(timer);
    }
  }, [router, priceCents]);

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
      setError(json.error ?? t('paymentUnavailable'));
    } catch {
      setError(t('paymentUnavailable'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[16px] font-bold uppercase tracking-[-0.01em] text-charcoal">
          {t('title')}
        </h2>
        {unlocked ? (
          <Badge tone="matcha">{t('badgeUnlocked')}</Badge>
        ) : capReached ? (
          <Badge tone="clay">{t('badgeCapReached')}</Badge>
        ) : (
          <Badge tone="matcha">{t('badgeFree')}</Badge>
        )}
      </div>

      <p className="mt-3 text-[14px] text-charcoal">
        {t.rich('countLine', {
          count,
          cap,
          b: (chunks) => <strong className="font-bold">{chunks}</strong>,
        })}
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
          {t('paymentConfirmed', { cap: unlockedCap })}
        </div>
      ) : null}

      {!unlocked ? (
        <>
          <p className="mt-4 text-[13.5px] leading-relaxed text-charcoal-muted">
            {capReached
              ? t('capReachedBody', { freeCap, cap: unlockedCap })
              : t('remainingBody', { remaining, cap: unlockedCap })}
          </p>
          <Button
            fullWidth
            size="md"
            className="mt-4 min-h-12 !h-auto py-3 !whitespace-normal text-center leading-tight"
            disabled={busy}
            onClick={() => void unlock()}
          >
            {busy ? t('redirecting') : t('unlockBtn', { cap: unlockedCap, price: priceLabel })}
          </Button>
          {error ? <p className="mt-3 text-[13px] text-clay">{error}</p> : null}
        </>
      ) : (
        <p className="mt-4 text-[13.5px] leading-relaxed text-charcoal-muted">
          {t('unlockedBody', { cap: unlockedCap })}
        </p>
      )}
    </Surface>
  );
}
