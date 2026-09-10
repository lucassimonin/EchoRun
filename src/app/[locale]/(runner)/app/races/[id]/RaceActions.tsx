'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { routing } from '@/i18n/routing';

/**
 * Actions destructrices, volontairement en bas de page et sans emphase.
 * Fermer les messages est reversible ; supprimer la course ne l'est pas.
 */
export function RaceActions({ raceId, status }: { raceId: string; status: string }) {
  const router = useRouter();
  const t = useTranslations('RaceActions');
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const patch = async (next: string) => {
    setBusy(true);
    await fetch('/api/races/' + raceId, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    const res = await fetch('/api/races/' + raceId, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) router.replace((locale === routing.defaultLocale ? '' : '/' + locale) + '/app');
  };

  return (
    <Surface className="bg-transparent shadow-none">
      <h2 className="text-[14px] font-bold uppercase tracking-[0.04em] text-charcoal">{t('title')}</h2>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {status === 'finished' ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void patch('open')}>
            {t('reopen')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => void patch('finished')}
          >
            {t('close')}
          </Button>
        )}

        {confirming ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void remove()}
              className="bg-clay hover:bg-clay/90"
            >
              {t('deleteConfirm')}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            {t('delete')}
          </Button>
        )}
      </div>

      {confirming ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-clay">
          {t('warning')}
        </p>
      ) : null}
    </Surface>
  );
}
