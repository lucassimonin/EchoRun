'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { routing } from '@/i18n/routing';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/**
 * Connexion par CODE à 8 chiffres (et non magic link).
 *
 * Pourquoi un code plutôt qu'un lien : aucun redirect, donc ça marche
 * identiquement sur le web ET dans l'app native (tout reste dans l'app, pas de
 * saut vers Safari), et les scanners d'e-mails ne « consomment » plus le
 * jeton comme ils le font avec un lien cliquable.
 */
export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('LoginForm');
  const locale = useLocale();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `next` est déjà sans préfixe de locale (posé par le middleware). On rajoute
  // le préfixe courant pour rester dans la bonne langue après connexion.
  const rawDest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
  const localePrefix = locale === routing.defaultLocale ? '' : '/' + locale;
  const destination = localePrefix + rawDest;

  const sendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError(t('invalidEmail'));
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
      // On remonte la vraie raison : rate limit, inscriptions désactivées, SMTP…
      const status = (authError as { status?: number }).status;
      if (status === 429) {
        setError(t('tooManyRequests'));
      } else {
        setError(authError.message || t('sendFailed'));
      }
      return;
    }
    trackEvent('login_code_requested');
    setEmail(trimmed);
    setCode('');
    setStep('code');
  };

  const verifyCode = async () => {
    const token = code.replace(/\s/g, '');
    if (token.length < 8) {
      setError(t('enterSixDigits'));
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
      setError(t('wrongCode'));
      return;
    }

    // Navigation complète : le serveur relit la session posée dans les cookies.
    window.location.assign(destination);
  };

  if (step === 'code') {
    return (
      <Surface>
        <p className="text-[13.5px] leading-relaxed text-charcoal-muted">
          {t.rich('codeSentTo', {
            email,
            strong: (chunks) => <strong className="text-charcoal">{chunks}</strong>,
          })}
        </p>

        <div className="mt-5">
          <Field label={t('codeLabel')} htmlFor="otp" error={error}>
            <TextInput
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="go"
              placeholder="12345678"
              maxLength={8}
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
          disabled={busy || code.replace(/\s/g, '').length < 8}
        >
          {busy ? t('connecting') : t('connect')}
        </Button>

        <div className="mt-5 flex items-center justify-between text-[12.5px]">
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="text-charcoal-faint underline underline-offset-2 transition-colors hover:text-charcoal disabled:opacity-50"
          >
            {t('resend')}
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
            {t('changeEmail')}
          </button>
        </div>
      </Surface>
    );
  }

  return (
    <Surface>
      <Field label={t('emailLabel')} htmlFor="email" error={error}>
        <TextInput
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="go"
          placeholder={t('emailPlaceholder')}
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
        {busy ? t('sending') : t('receiveCode')}
      </Button>
    </Surface>
  );
}
