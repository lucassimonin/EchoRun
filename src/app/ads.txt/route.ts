import { getAppSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * /ads.txt — autorisation des vendeurs publicitaires (IAB ads.txt).
 *
 * Généré à partir de l'identifiant AdSense du back-office : `ca-pub-XXXX`
 * devient `pub-XXXX`. `f08c47fec0942fa0` est l'ID de certification fixe de
 * Google, identique pour tous les éditeurs AdSense.
 *
 * Tant qu'aucun identifiant n'est configuré, on renvoie 404 : un ads.txt vide
 * ou invalide vaut mieux ne pas exister.
 */
export async function GET() {
  const settings = await getAppSettings();
  const clientId = settings.adsense_client_id;

  if (!clientId || !/^ca-pub-\d{10,20}$/.test(clientId)) {
    return new Response('Not found', { status: 404 });
  }

  const publisherId = clientId.replace(/^ca-/, ''); // ca-pub-XXXX -> pub-XXXX
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
