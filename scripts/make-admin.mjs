/**
 * ============================================================================
 * Promotion / rétrogradation d'un administrateur — `npm run admin`
 * ============================================================================
 *
 * Usage :
 *   npm run admin -- lucas@exemple.fr            # promeut
 *   npm run admin -- lucas@exemple.fr --revoke   # rétrograde
 *   npm run admin -- --list                      # liste les admins
 *
 * Passe par la clé `service_role` et l'API Supabase (pas de connexion Postgres
 * directe) : le script marche donc à l'identique en local et contre le projet
 * cloud de production, sans exposer de chaîne de connexion.
 *
 * `is_admin` est protégé par RLS côté application (personne ne peut s'auto-
 * promouvoir) ; ce script est le canal d'administration légitime, réservé à
 * qui détient la clé service_role — donc à toi, pas à un visiteur.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// --------------------------------------------------------- chargement .env --
// On lit .env.local puis .env, sans dépendance : le script doit tourner aussi
// bien en CLI de dev qu'en étape de déploiement.
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const content = readFileSync(join(process.cwd(), file), 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        if (process.env[key] !== undefined) continue; // l'environnement réel gagne
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    } catch {
      /* fichier absent : normal en CI, l'environnement fournit les variables */
    }
  }
}

function fail(message) {
  console.error('\x1b[31m✗\x1b[0m ' + message);
  process.exit(1);
}

function ok(message) {
  console.log('\x1b[32m✓\x1b[0m ' + message);
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    fail(
      'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis ' +
        '(dans .env.local, .env, ou l’environnement).',
    );
  }

  const args = process.argv.slice(2);
  const revoke = args.includes('--revoke');
  const list = args.includes('--list');
  const email = args.find((a) => !a.startsWith('--'))?.trim().toLowerCase();

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ------------------------------------------------------------- --list -----
  if (list) {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, display_name, created_at')
      .eq('is_admin', true)
      .order('created_at', { ascending: true });

    if (error) fail('Lecture impossible : ' + error.message);
    if (!data || data.length === 0) {
      console.log('Aucun administrateur pour l’instant.');
      return;
    }
    console.log('Administrateurs (' + data.length + ') :');
    for (const row of data) {
      console.log('  • ' + (row.email ?? '(sans e-mail)') + (row.display_name ? ' — ' + row.display_name : ''));
    }
    return;
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
    fail('Indique une adresse e-mail valide. Ex : npm run admin -- toi@exemple.fr');
  }

  // ------------------------------------------------- vérif du compte auth ----
  // Le profil peut ne pas exister encore (compte créé, jamais connecté à
  // l'app). On confirme d'abord que le compte existe côté Auth, puis on
  // s'assure du profil avant de le promouvoir.
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (authError) fail('Accès Auth impossible : ' + authError.message);

  const authUser = authUsers.users.find((u) => u.email?.toLowerCase() === email);
  if (!authUser) {
    fail(
      'Aucun compte pour « ' + email + ' ». La personne doit s’être connectée ' +
        'au moins une fois (lien magique) avant d’être promue.',
    );
  }

  // Crée le profil s'il manque (même logique que l'auto-réparation applicative).
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: authUser.id,
      email: authUser.email,
      display_name: authUser.email?.split('@')[0] ?? null,
      is_admin: !revoke,
    });
    if (insertError) fail('Création du profil impossible : ' + insertError.message);
    ok((revoke ? 'Profil créé (non admin)' : 'Profil créé et promu admin') + ' pour ' + email + '.');
    return;
  }

  const target = !revoke;
  if (existing.is_admin === target) {
    ok(email + ' est déjà ' + (target ? 'administrateur' : 'non administrateur') + '. Rien à faire.');
    return;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_admin: target })
    .eq('id', authUser.id);

  if (updateError) fail('Mise à jour impossible : ' + updateError.message);

  ok(email + (target ? ' est maintenant administrateur.' : ' a été rétrogradé.'));
  if (target) {
    console.log('  → La personne doit se reconnecter pour que /admin s’ouvre.');
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
