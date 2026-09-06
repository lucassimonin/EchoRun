import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
/** Le corps brut est indispensable a la verification de signature. */
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 *
 * Seule source de verite du paiement. Le retour navigateur (`?unlocked=1`)
 * n'est qu'un indice d'interface : un utilisateur peut le forger, pas ce
 * webhook.
 *
 * Modele « le coureur paie » : un paiement debloque une COURSE
 * (`purpose = 'unlock'`). Idempotence : on ne debloque que si la commande est
 * encore `pending` ; Stripe rejoue volontiers le meme evenement.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Signature manquante.' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status !== 'paid') break;
        await handlePaidSession(supabase, session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_session_id', session.id)
          .eq('status', 'pending');
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        if (typeof charge.payment_intent === 'string') {
          await supabase
            .from('payments')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent', charge.payment_intent);
        }
        break;
      }

      default:
        break;
    }
  } catch {
    // On renvoie 500 pour que Stripe rejoue : mieux vaut un retry qu'un
    // deblocage perdu pour un coureur qui a paye.
    return NextResponse.json({ error: 'Traitement impossible.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function handlePaidSession(supabase: AdminClient, session: Stripe.Checkout.Session) {
  const { data: payment } = await supabase
    .from('payments')
    .select('id, race_id, purpose, status')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  // Deja traite (rejeu Stripe) : on sort sans rien refaire.
  if (payment && payment.status === 'paid') return;

  const raceId = payment?.race_id ?? session.metadata?.race_id ?? session.client_reference_id;
  const purpose = payment?.purpose ?? session.metadata?.purpose ?? 'unlock';

  if (!raceId) return;

  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  if (payment) {
    const { data: updated } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent: paymentIntent,
        amount_cents: session.amount_total ?? undefined,
      })
      .eq('id', payment.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    // La ligne n'etait plus `pending` : un autre rejeu a gagne la course.
    if (!updated) return;
  } else {
    // Filet de securite : session creee hors de notre flux nominal.
    await supabase.from('payments').insert({
      race_id: raceId,
      contributor_id: null,
      stripe_session_id: session.id,
      stripe_payment_intent: paymentIntent,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? 'eur',
      credits_granted: 1,
      purpose,
      status: 'paid',
      paid_at: new Date().toISOString(),
    });
  }

  if (purpose === 'unlock') {
    await supabase.rpc('unlock_race_messages', { p_race_id: raceId });
  }
}
