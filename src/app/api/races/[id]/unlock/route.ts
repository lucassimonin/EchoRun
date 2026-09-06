import { NextResponse } from 'next/server';
import { jsonError, tooManyRequests } from '@/lib/api';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAppSettings } from '@/lib/settings';
import { getStripe, siteUrl } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/races/[id]/unlock
 *
 * Deblocage payant par le COUREUR (authentifie, proprietaire de la course) :
 * fait passer le plafond de messages de l'offert au palier debloque. Cree une
 * session Stripe Checkout ; c'est le webhook qui bascule reellement la course
 * (`messages_unlocked`). Le prix vient de la base, jamais du client.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Connexion requise.', 401);

  const limit = checkRateLimit('unlock:' + user.id, 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const { id } = await ctx.params;

  // RLS : cette lecture ne renvoie la course que si l'utilisateur en est le
  // proprietaire (ou admin).
  const { data: race } = await supabase
    .from('races')
    .select('id, name, share_slug, status, messages_unlocked')
    .eq('id', id)
    .maybeSingle();

  if (!race) return jsonError('Course introuvable.', 404);
  if (race.messages_unlocked) return jsonError('Cette course est deja debloquee.', 409);
  if (race.status === 'finished') return jsonError('Cette course est terminee.', 409);

  const settings = await getAppSettings();
  const admin = createAdminClient();

  try {
    const stripe = getStripe();
    const returnUrl = siteUrl('/app/races/' + race.id);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: settings.unlock_price_cents,
            product_data: {
              name: 'Deblocage EchoRun',
              description:
                'Jusqu a ' +
                settings.unlocked_message_cap +
                ' messages sur « ' +
                race.name +
                ' ». Tes proches ne paient rien.',
            },
          },
        },
      ],
      client_reference_id: race.id,
      metadata: { purpose: 'unlock', race_id: race.id, user_id: user.id },
      success_url: returnUrl + '?unlocked=1',
      cancel_url: returnUrl,
      locale: 'fr',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    if (!session.url) return jsonError('Session de paiement invalide.', 500);

    await admin.from('payments').insert({
      race_id: race.id,
      contributor_id: null,
      stripe_session_id: session.id,
      amount_cents: settings.unlock_price_cents,
      currency: 'eur',
      credits_granted: 1,
      purpose: 'unlock',
      status: 'pending',
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return jsonError('Le paiement est momentanement indisponible.', 502);
  }
}
