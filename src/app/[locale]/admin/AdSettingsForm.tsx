'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput, Toggle } from '@/components/ui/Field';
import { Divider, Surface } from '@/components/ui/Surface';
import type { AppSettings } from '@/types';

const CLIENT_ID_RE = /^ca-pub-\d{10,20}$/;
const SLOT_RE = /^\d{6,20}$/;
const GTM_RE = /^GTM-[A-Z0-9]{4,12}$/i;

export function AdSettingsForm({ settings }: { settings: AppSettings }) {
  const t = useTranslations('AdSettings');
  const router = useRouter();
  const [form, setForm] = useState({
    ads_enabled: settings.ads_enabled,
    adsense_client_id: settings.adsense_client_id ?? '',
    adsense_slot_landing: settings.adsense_slot_landing ?? '',
    adsense_slot_contributor: settings.adsense_slot_contributor ?? '',
    adsense_slot_finish: settings.adsense_slot_finish ?? '',
    gtm_container_id: settings.gtm_container_id ?? '',
    free_message_cap: String(settings.free_message_cap),
    unlocked_message_cap: String(settings.unlocked_message_cap),
    per_contributor_cap: String(settings.per_contributor_cap),
    unlock_price_cents: String(settings.unlock_price_cents),
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const clientIdInvalid =
    form.adsense_client_id.length > 0 && !CLIENT_ID_RE.test(form.adsense_client_id.trim());

  const slotInvalid = (value: string) => value.length > 0 && !SLOT_RE.test(value.trim());

  const gtmInvalid =
    form.gtm_container_id.length > 0 && !GTM_RE.test(form.gtm_container_id.trim());

  const unlockPriceCents = Number(form.unlock_price_cents);
  const priceInvalid =
    !Number.isInteger(unlockPriceCents) || unlockPriceCents < 50 || unlockPriceCents > 5000;

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ads_enabled: form.ads_enabled,
          adsense_client_id: form.adsense_client_id.trim() || null,
          adsense_slot_landing: form.adsense_slot_landing.trim() || null,
          adsense_slot_contributor: form.adsense_slot_contributor.trim() || null,
          adsense_slot_finish: form.adsense_slot_finish.trim() || null,
          gtm_container_id: form.gtm_container_id.trim().toUpperCase() || null,
          free_message_cap: Number(form.free_message_cap) || 0,
          unlocked_message_cap: Number(form.unlocked_message_cap) || 0,
          per_contributor_cap: Number(form.per_contributor_cap) || 1,
          unlock_price_cents: unlockPriceCents,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage({ tone: 'error', text: json.error ?? t('saveFailed') });
        return;
      }
      setMessage({ tone: 'ok', text: t('saveOk') });
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: t('saveFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface>
      <Toggle
        id="ads-enabled"
        checked={form.ads_enabled}
        onChange={(next) => set('ads_enabled', next)}
        label={t('adsToggleLabel')}
        description={t('adsToggleDesc')}
      />

      <Divider className="my-7" />

      <div className="space-y-5">
        <Field
          label={t('clientIdLabel')}
          htmlFor="client-id"
          hint={t('clientIdHint')}
          error={clientIdInvalid ? t('clientIdError') : null}
        >
          <TextInput
            id="client-id"
            value={form.adsense_client_id}
            onChange={(e) => set('adsense_client_id', e.target.value)}
            placeholder="ca-pub-0000000000000000"
            spellCheck={false}
            autoComplete="off"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label={t('slotLandingLabel')}
            htmlFor="slot-landing"
            error={slotInvalid(form.adsense_slot_landing) ? t('slotError') : null}
          >
            <TextInput
              id="slot-landing"
              value={form.adsense_slot_landing}
              onChange={(e) => set('adsense_slot_landing', e.target.value)}
              placeholder="1234567890"
              inputMode="numeric"
            />
          </Field>

          <Field
            label={t('slotContributorLabel')}
            htmlFor="slot-contributor"
            error={slotInvalid(form.adsense_slot_contributor) ? t('slotError') : null}
          >
            <TextInput
              id="slot-contributor"
              value={form.adsense_slot_contributor}
              onChange={(e) => set('adsense_slot_contributor', e.target.value)}
              placeholder="1234567890"
              inputMode="numeric"
            />
          </Field>

          <Field
            label={t('slotFinishLabel')}
            htmlFor="slot-finish"
            error={slotInvalid(form.adsense_slot_finish) ? t('slotError') : null}
          >
            <TextInput
              id="slot-finish"
              value={form.adsense_slot_finish}
              onChange={(e) => set('adsense_slot_finish', e.target.value)}
              placeholder="1234567890"
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field
          label={t('gtmLabel')}
          htmlFor="gtm-id"
          hint={t('gtmHint')}
          error={gtmInvalid ? t('gtmError') : null}
        >
          <TextInput
            id="gtm-id"
            value={form.gtm_container_id}
            onChange={(e) => set('gtm_container_id', e.target.value)}
            placeholder="GTM-XXXXXXX"
            spellCheck={false}
            autoComplete="off"
          />
        </Field>
      </div>

      <Divider className="my-7" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t('freeCapLabel')}
          htmlFor="free-cap"
          hint={t('freeCapHint')}
        >
          <TextInput
            id="free-cap"
            value={form.free_message_cap}
            onChange={(e) => set('free_message_cap', e.target.value)}
            inputMode="numeric"
          />
        </Field>

        <Field
          label={t('unlockedCapLabel')}
          htmlFor="unlocked-cap"
          hint={t('unlockedCapHint')}
        >
          <TextInput
            id="unlocked-cap"
            value={form.unlocked_message_cap}
            onChange={(e) => set('unlocked_message_cap', e.target.value)}
            inputMode="numeric"
          />
        </Field>

        <Field
          label={t('perContributorLabel')}
          htmlFor="per-contributor"
          hint={t('perContributorHint')}
        >
          <TextInput
            id="per-contributor"
            value={form.per_contributor_cap}
            onChange={(e) => set('per_contributor_cap', e.target.value)}
            inputMode="numeric"
          />
        </Field>

        <Field
          label={t('unlockPriceLabel')}
          htmlFor="unlock-price"
          hint={t('unlockPriceHint')}
          error={priceInvalid ? t('priceError') : null}
        >
          <TextInput
            id="unlock-price"
            value={form.unlock_price_cents}
            onChange={(e) => set('unlock_price_cents', e.target.value)}
            inputMode="numeric"
          />
        </Field>
      </div>

      {message ? (
        <p
          className={
            'mt-6 text-[13px] font-bold ' + (message.tone === 'ok' ? 'text-black' : 'text-danger')
          }
        >
          {message.text}
        </p>
      ) : null}

      <Button
        className="mt-7"
        onClick={() => void submit()}
        disabled={busy || clientIdInvalid || priceInvalid || gtmInvalid}
      >
        {busy ? t('saving') : t('save')}
      </Button>
    </Surface>
  );
}
