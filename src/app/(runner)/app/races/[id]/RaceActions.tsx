'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';

/**
 * Actions destructrices, volontairement en bas de page et sans emphase.
 * Fermer les messages est reversible ; supprimer la course ne l'est pas.
 */
export function RaceActions({ raceId, status }: { raceId: string; status: string }) {
  const router = useRouter();
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
    if (res.ok) router.replace('/app');
  };

  return (
    <Surface className="bg-transparent shadow-none">
      <h2 className="text-[14px] font-medium text-charcoal">Gérer la course</h2>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {status === 'finished' ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void patch('open')}>
            Réouvrir aux messages
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => void patch('finished')}
          >
            Clôturer les dépôts
          </Button>
        )}

        {confirming ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void remove()}
              className="bg-clay hover:bg-clay/90"
            >
              Supprimer définitivement
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Supprimer la course
          </Button>
        )}
      </div>

      {confirming ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-clay">
          Cette action efface la course et tous les messages vocaux reçus. Irréversible.
        </p>
      ) : null}
    </Surface>
  );
}
