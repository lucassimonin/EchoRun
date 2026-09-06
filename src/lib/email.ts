/**
 * Envoi d'e-mails transactionnels via Resend.
 *
 * Volontairement « best-effort » et OPTIONNEL : sans `RESEND_API_KEY`, rien
 * n'est envoyé et la fonction ne jette jamais — le flux applicatif (poser un
 * message, débloquer une course) ne doit jamais échouer parce qu'un mail n'est
 * pas parti. On passe par `fetch` plutôt que par le SDK pour ne pas ajouter de
 * dépendance.
 *
 * Pour activer en production :
 *   RESEND_API_KEY=re_...              (clé Resend)
 *   EMAIL_FROM="EchoRun <bonjour@echo-run.app>"   (expéditeur, domaine vérifié)
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'EchoRun <bonjour@echo-run.app>';

  if (!apiKey) {
    // Non configuré : on log en dev, on ne casse rien.
    console.info('[email] RESEND_API_KEY absent — e-mail non envoyé :', subject, '->', to);
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) {
      console.error('[email] Resend a répondu', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] envoi impossible :', err);
    return false;
  }
}

/**
 * Prévient le coureur que le nombre de messages offerts de sa course est
 * atteint, et l'invite à débloquer le palier supérieur.
 */
export async function sendCapReachedEmail(args: {
  to: string;
  raceName: string;
  freeCap: number;
  unlockedCap: number;
  priceLabel: string;
  unlockUrl: string;
}): Promise<boolean> {
  const { to, raceName, freeCap, unlockedCap, priceLabel, unlockUrl } = args;
  const subject = `Ta course « ${raceName} » a reçu ${freeCap} messages 🎉`;

  const text = [
    `Bonne nouvelle : tes proches ont déjà déposé ${freeCap} messages vocaux sur « ${raceName} ».`,
    '',
    `C'est le nombre offert. Pour continuer à en recevoir (jusqu'à ${unlockedCap} au total),`,
    `tu peux débloquer ta course pour ${priceLabel}. Tes proches ne paient jamais rien.`,
    '',
    `Débloquer : ${unlockUrl}`,
    '',
    '— EchoRun',
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;color:#111812;">
      <h1 style="font-size:20px;font-weight:600;">Ta course a reçu ${freeCap} messages 🎉</h1>
      <p style="font-size:15px;line-height:1.6;color:#3f4a42;">
        Tes proches ont déjà déposé <strong>${freeCap} messages vocaux</strong> sur
        « ${raceName} ». C'est le nombre offert.
      </p>
      <p style="font-size:15px;line-height:1.6;color:#3f4a42;">
        Pour continuer à en recevoir — jusqu'à <strong>${unlockedCap} au total</strong> —
        tu peux débloquer ta course pour <strong>${priceLabel}</strong>. Tes proches, eux, ne
        paient jamais rien.
      </p>
      <p style="margin:28px 0;">
        <a href="${unlockUrl}"
           style="background:#3E5A47;color:#FAF8F5;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600;font-size:15px;">
          Débloquer ma course
        </a>
      </p>
      <p style="font-size:13px;color:#8a938c;">— EchoRun</p>
    </div>`.trim();

  return sendEmail({ to, subject, html, text });
}
