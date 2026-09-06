'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(trimmed)) {
      setError('Adresse e-mail invalide.');
      return;
    }

    setState('sending');
    setError(null);

    const supabase = createClient();
    const redirect = new URL('/auth/callback', window.location.origin);
    if (next) redirect.searchParams.set('next', next);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirect.toString() },
    });

    if (authError) {
      setState('idle');
      setError('Envoi impossible. Réessaie dans un instant.');
      return;
    }
    setState('sent');
  };

  if (state === 'sent') {
    return (
      <Surface className="text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-matcha-100 text-matcha-500">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M2.5 5.5h15v9h-15v-9Zm0 .5 7.5 5 7.5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="mt-4 text-[15px] font-medium text-charcoal">Regarde tes e-mails</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal-muted">
          Un lien de connexion vient de partir vers <strong>{email.trim()}</strong>. Il est valable
          une heure.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="mt-5 text-[13px] text-charcoal-faint underline underline-offset-2 transition-colors hover:text-charcoal"
        >
          Utiliser une autre adresse
        </button>
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
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
      </Field>
      <Button
        className="mt-5"
        fullWidth
        size="lg"
        onClick={() => void submit()}
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Envoi…' : 'Recevoir mon lien'}
      </Button>
    </Surface>
  );
}
