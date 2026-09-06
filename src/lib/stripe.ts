import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY manquante.');
  // Pas d'`apiVersion` fige : on suit celle du SDK installe, ce qui evite un
  // desalignement silencieux entre les types et les reponses reelles.
  cached = new Stripe(key, {
    appInfo: { name: 'EchoRun', version: '0.1.0' },
  });
  return cached;
}

export function siteUrl(path = ''): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return base + path;
}
