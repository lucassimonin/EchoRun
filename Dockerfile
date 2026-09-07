# ============================================================================
# EchoRun • image de production (Next.js standalone)
#
# À SAVOIR : les variables NEXT_PUBLIC_* sont INLINÉES au BUILD par Next.js
# (elles finissent dans le bundle navigateur). Elles doivent donc être passées
# en `--build-arg`, pas seulement au runtime. Les secrets serveur
# (service_role, Stripe) restent au runtime, via env_file / -e.
# ============================================================================

# ------------------------------------------------------------------ deps -----
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# ----------------------------------------------------------------- builder ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Active la sortie `standalone` (cf. next.config.ts).
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1

# Variables publiques nécessaires AU BUILD. Fournies par --build-arg (compose).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_LEGAL_ENTITY
ARG NEXT_PUBLIC_LEGAL_CONTACT_EMAIL
ARG NEXT_PUBLIC_MAP_TILE_URL
ARG NEXT_PUBLIC_MAP_ATTRIBUTION
ARG NEXT_PUBLIC_MAP_SUBDOMAINS
ARG NEXT_PUBLIC_MAP_MAX_ZOOM
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_LEGAL_ENTITY=$NEXT_PUBLIC_LEGAL_ENTITY \
    NEXT_PUBLIC_LEGAL_CONTACT_EMAIL=$NEXT_PUBLIC_LEGAL_CONTACT_EMAIL \
    NEXT_PUBLIC_MAP_TILE_URL=$NEXT_PUBLIC_MAP_TILE_URL \
    NEXT_PUBLIC_MAP_ATTRIBUTION=$NEXT_PUBLIC_MAP_ATTRIBUTION \
    NEXT_PUBLIC_MAP_SUBDOMAINS=$NEXT_PUBLIC_MAP_SUBDOMAINS \
    NEXT_PUBLIC_MAP_MAX_ZOOM=$NEXT_PUBLIC_MAP_MAX_ZOOM

RUN npm run build

# ------------------------------------------------------------------ runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Sans ça, le serveur standalone écoute sur localhost et n'est PAS
    # joignable depuis l'extérieur du conteneur.
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Petit healthcheck : la racine doit répondre.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
