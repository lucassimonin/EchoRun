# Déploiement d'EchoRun sur ton serveur (echo-run.app)

Ce guide déploie EchoRun sur un serveur Linux que tu contrôles (VPS type
Hetzner / OVH / Scaleway / DigitalOcean...), avec **Docker + Caddy** (HTTPS
automatique). Supabase reste **hébergé chez Supabase** (cloud) — on ne
l'auto-héberge pas ici.

Architecture en prod :

```
Navigateur ──HTTPS──▶ Caddy (443)  ──http──▶  web (Next.js standalone, :3000)
                        │                         │
                        └─ certifs Let's Encrypt  └─▶ Supabase cloud + Stripe
```

---

## 0. Ce qu'il te faut

- Un serveur Linux (Ubuntu/Debian récent), 1 vCPU / 1–2 Go de RAM suffisent.
- Le domaine **echo-run.app** (chez ton registrar).
- Le projet Supabase déjà créé (celui de dev convient, ou un projet dédié prod).
- Les clés Stripe **live** + un webhook (voir §6).

---

## 1. DNS

Chez ton registrar, crée deux enregistrements **A** (ou AAAA si IPv6) qui
pointent vers l'IP publique de ton serveur :

| Type | Nom            | Valeur              |
|------|----------------|---------------------|
| A    | `@` (echo-run.app) | `IP_DU_SERVEUR` |
| A    | `www`          | `IP_DU_SERVEUR`     |

Attends que ça se propage (`dig echo-run.app +short` doit renvoyer ton IP).
Caddy ne pourra générer le certificat qu'une fois le DNS correct.

---

## 2. Préparer le serveur

Installe Docker (script officiel) et ouvre les ports web :

```bash
# Docker + plugin compose
curl -fsSL https://get.docker.com | sh

# Pare-feu : SSH + HTTP + HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Vérifie : `docker --version` et `docker compose version`.

---

## 3. Récupérer le code

```bash
git clone <URL_DE_TON_REPO> echorun
cd echorun
```

(ou `scp`/`rsync` le dossier si le repo n'est pas en ligne).

---

## 4. Configurer les variables

Copie l'exemple et remplis-le :

```bash
cp .env.production.example .env.production
nano .env.production
```

À remplir impérativement :

- `NEXT_PUBLIC_SUPABASE_URL` — l'URL de ton projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — la clé anon (publique).
- `SUPABASE_SERVICE_ROLE_KEY` — la clé service_role (**secrète**, serveur seul).
- `NEXT_PUBLIC_SITE_URL` — `https://echo-run.app`.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — voir §6.
- `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL` — ton email de contact légal.

> ⚠️ Les `NEXT_PUBLIC_*` sont **inlinées au build**. Si tu en changes une, il
> faut **rebuild** (`up -d --build`), pas juste redémarrer.

Les clés Supabase se trouvent dans le dashboard Supabase →
*Project Settings → API*.

---

## 5. Appliquer les migrations de base de données

Les tables / RLS / fonctions vivent dans `supabase/migrations/`. Depuis ta
machine (pas forcément le serveur), avec la CLI Supabase liée au projet :

```bash
npm run db:link      # une seule fois : relie au projet distant
supabase db push     # applique les migrations sur le projet cloud
```

Puis crée ton compte admin (magic link) et passe-le admin :

```bash
# après t'être connecté une fois sur https://echo-run.app pour créer le profil
npm run admin -- ton.email@exemple.com
```

---

## 6. Stripe

1. Passe en mode **live** dans le dashboard Stripe.
2. Récupère la clé secrète `sk_live_...` → `STRIPE_SECRET_KEY`.
3. Crée un webhook : *Developers → Webhooks → Add endpoint*
   - URL : `https://echo-run.app/api/stripe/webhook`
   - Événements : au minimum `checkout.session.completed`.
4. Copie le *Signing secret* `whsec_...` → `STRIPE_WEBHOOK_SECRET`.

---

## 7. Supabase — URLs de redirection

Dans le dashboard Supabase → *Authentication → URL Configuration* :

- **Site URL** : `https://echo-run.app`
- **Redirect URLs** : ajoute `https://echo-run.app/auth/callback`

Sans ça, les liens magiques renverront vers localhost.

---

## 8. Lancer

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Le premier build prend quelques minutes. Ensuite Caddy récupère le certificat
tout seul. Vérifie :

```bash
docker compose -f docker-compose.prod.yml ps      # les 2 services "up"
docker compose -f docker-compose.prod.yml logs -f caddy   # obtention du certif
```

Ouvre https://echo-run.app 🎉

---

## 9. Mettre à jour

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker image prune -f    # nettoie les vieilles images
```

Si tu as ajouté des migrations : relance `supabase db push` (§5).

---

## 10. Sauvegardes & maintenance

- **Base de données** : Supabase gère les backups automatiques (voir le plan de
  ton projet dans le dashboard). Pour un dump manuel : `supabase db dump`.
- **Certificats & état Caddy** : persistés dans le volume `caddy_data`
  (ne le supprime pas, sinon régénération des certifs — quota Let's Encrypt).
- **Logs** : `docker compose -f docker-compose.prod.yml logs -f web`.
- **Redémarrage propre** : `docker compose -f docker-compose.prod.yml restart`.

---

## Dépannage

| Symptôme | Piste |
|----------|-------|
| Caddy ne délivre pas le certif | DNS pas encore propagé, ou ports 80/443 fermés / occupés. |
| Page blanche, Supabase vide côté navigateur | un `NEXT_PUBLIC_*` manquait au build → `up -d --build`. |
| Lien magique renvoie vers localhost | Redirect URLs Supabase pas à jour (§7). |
| Paiement OK mais crédits non ajoutés | webhook Stripe mal configuré ou mauvais `STRIPE_WEBHOOK_SECRET` (§6). |
| 502 Bad Gateway | le conteneur `web` n'est pas up : `docker compose ... logs web`. |

---

## Application mobile

Le build de l'app native (Capacitor) est décrit dans
[`NATIVE.md`](./NATIVE.md). Elle pointe vers le site hébergé — pense à régler
`CAP_SERVER_URL=https://echo-run.app` avant de la compiler.
