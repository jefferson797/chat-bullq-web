# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile --production=false

FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Endereço do TunerID, para o botão "Entrar com TunerID".
#
# Precisa ser ARG, não só variável no painel: o Next INLINA `NEXT_PUBLIC_*` em
# tempo de compilação. Sem o ARG ela chega vazia, o `{TUNERID_WEB && ...}` vira
# condição falsa constante, e o bundler APAGA o bloco inteiro — some até o
# texto do botão. O deploy diz "pronto" e a tela volta sem o botão, sem erro
# nenhum em lugar nenhum. Foi exatamente o que aconteceu no Academy.
ARG NEXT_PUBLIC_TUNERID_WEB_URL
ENV NEXT_PUBLIC_TUNERID_WEB_URL=${NEXT_PUBLIC_TUNERID_WEB_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && yarn build

FROM node:20-alpine AS runner
RUN apk add --no-cache curl tini
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -sfL http://localhost:3000/ -o /dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
