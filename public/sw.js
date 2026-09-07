/* eslint-disable no-restricted-globals */
/**
 * EchoRun • Service Worker minimal, ecrit a la main.
 *
 * Pourquoi pas next-pwa / serwist ? Le seul besoin offline critique est
 * l'ecran de course. Les audios ET leurs metadonnees sont stockes par
 * l'application dans IndexedDB (cf. src/lib/offline/db.ts) • donc le SW n'a
 * qu'un role : garantir que le shell de l'app se charge sans reseau.
 * Moins de magie de build = comportement previsible le jour J.
 */

const VERSION = 'echorun-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

/** Pages indispensables une fois le dossard sur le maillot. */
const SHELL_URLS = ['/', '/app', '/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/**
 * Strategie :
 *  - navigations  -> network-first, fallback cache puis /offline
 *  - /_next/static, tuiles, polices -> stale-while-revalidate
 *  - tout le reste (API, Supabase, Stripe) -> reseau direct, jamais cache
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) return;

  // Scripts tiers de pub / analytics / tag : on ne les intercepte pas et on
  // ne les met surtout pas en cache. Ils doivent aller droit au reseau, sinon
  // un blocage (adblock) ou une reponse opaque se transforme en erreur confuse.
  const THIRD_PARTY_BYPASS = [
    'googlesyndication.com',
    'googletagmanager.com',
    'google-analytics.com',
    'googleadservices.com',
    'doubleclick.net',
    'adtrafficquality.google',
  ];
  if (THIRD_PARTY_BYPASS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('/offline')) ?? Response.error()),
    );
    return;
  }

  const isCacheableAsset =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|png|svg|webp|avif)$/.test(url.pathname) ||
    url.hostname.endsWith('basemaps.cartocdn.com');

  if (!isCacheableAsset) return;

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(request, res.clone()).catch(() => undefined);
          return res;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? network;
    }),
  );
});
