'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';

/** Le lien de partage, façon Tricount : une ligne, un bouton, rien d'autre. */
export function ShareCard({ shareUrl, raceName }: { shareUrl: string; raceName: string }) {
  const [copied, setCopied] = useState(false);
  // `navigator.share` n'existe pas au rendu serveur. Le calculer directement
  // ferait diverger le premier rendu client du HTML serveur -> erreur
  // d'hydratation. On part donc de `false` (comme le serveur) et on révèle le
  // bouton une fois monté, quand `navigator` est disponible.
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard refusé (http, permissions) : le champ reste sélectionnable */
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: 'Laisse-moi un message vocal pour ' + raceName,
        text: 'Je cours ' + raceName + '. Dépose un vocal sur mon parcours, je l’entendrai en courant.',
        url: shareUrl,
      });
    } catch {
      /* partage annulé */
    }
  };

  return (
    <Surface>
      <h2 className="text-[16px] font-bold uppercase tracking-[-0.01em] text-charcoal">
        Le lien à envoyer à tes proches
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal-muted">
        Aucun compte, aucune application. Ils ouvrent, ils parlent — 5 messages max par personne.
      </p>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <input
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="h-12 min-w-0 flex-1 rounded-lg border-[3px] border-black bg-off px-4 font-mono text-[13px] text-black"
          aria-label="Lien de partage"
        />
        <Button onClick={() => void copy()} size="md" variant={copied ? 'secondary' : 'primary'}>
          {copied ? 'Copié' : 'Copier'}
        </Button>
        {canShare ? (
          <Button onClick={() => void share()} size="md" variant="secondary">
            Partager
          </Button>
        ) : null}
      </div>
    </Surface>
  );
}
