'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';
import { createClient } from '@/lib/supabase/client';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/**
 * Connexion par CODE à 6 chiffres (et non magic link).
 *
 * Pourquoi un code plutôt qu'un lien : aucun redirect, donc ça marche
 * identiquement sur le web ET dans l'app native (tout reste dans l'app, pas de
 * saut vers Safari), et les scanners d'e-mails ne « consomment » plus le
 * jeton comme ils le font avec un lien cliquable.
 */
export function LoginForm({ next }: { next?: string }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';

  const sendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Adresse e-mail invalide.');
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });

    setBusy(false);
    if (authError) {
      setError('Envoi impossible. Réessaie dans un instant.');
      return;
    }
    setEmail(trimmed);
    setCode('');
    setStep('code');
  };

  const verifyCode = async () => {
    const token = code.replace(/\s/g, '');
    if (token.length < 6) {
      setError('Entre les 6 chiffres reçus par e-mail.');
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyError) {
      setBusy(false);
      setError('Code incorrect ou expiré. Vérifie, ou renvoie un code.');
      return;
    }

    // Navigation complète : le serveur relit la session posée dans les cookies.
    window.location.assign(destination);
  };

  if (step === 'code') {
    return (
      <Surface>
        <p className="text-[13.5px] leading-relaxed text-charcoal-muted">
          On vient d’envoyer un code à 6 chiffres à{' '}
          <strong className="text-charcoal">{email}</strong>. Il est valable une heure.
        </p>

        <div className="mt-5">
          <Field label="Code reçu par e-mail" htmlFor="otp" error={error}>
            <TextInput
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="go"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && void verifyCode()}
            />
          </Field>
        </div>

        <Button
          className="mt-5"
          fullWidth
          size="lg"
          onClick={() => void verifyCode()}
          disabled={busy || code.replace(/\s/g, '').length < 6}
        >
          {busy ? 'Connexion…' : 'Me connecter'}
        </Button>

        <div className="mt-5 flex items-center justify-between text-[12.5px]">
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="text-charcoal-faint underline underline-offset-2 transition-colors hover:text-charcoal disabled:opacity-50"
          >
            Renvoyer un code
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
            className="text-charcoal-faint underline underline-offset-2 transition-colors hover:text-charcoal"
          >
            Changer d’adresse
          </button>
        </div>
      </Surface>
    );
  }

  return (
    <Surface>
      <Field label="Adresse e-mail" htmlFor="email" error={error}>
        <TextInput
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="go"
          placeholder="toi@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void sendCode()}
        />
      </Field>
      <Button
        className="mt-5"
        fullWidth
        size="lg"
        onClick={() => void sendCode()}
        disabled={busy}
      >
        {busy ? 'Envoi…' : 'Recevoir mon code'}
      </Button>
    </Surface>
  );
}
