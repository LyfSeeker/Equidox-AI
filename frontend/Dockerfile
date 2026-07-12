# Equidox AI Frontend — Next.js production image
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# ---
FROM node:22-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_STELLAR_NETWORK=testnet
ARG NEXT_PUBLIC_GRANT_MANAGER_CONTRACT_ID=
ARG NEXT_PUBLIC_BUILDER_PASSPORT_CONTRACT_ID=
ARG NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8180
ARG NEXT_PUBLIC_KEYCLOAK_REALM=equidox
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=equidox-frontend

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STELLAR_NETWORK=$NEXT_PUBLIC_STELLAR_NETWORK
ENV NEXT_PUBLIC_GRANT_MANAGER_CONTRACT_ID=$NEXT_PUBLIC_GRANT_MANAGER_CONTRACT_ID
ENV NEXT_PUBLIC_BUILDER_PASSPORT_CONTRACT_ID=$NEXT_PUBLIC_BUILDER_PASSPORT_CONTRACT_ID
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S equidox && adduser -S equidox -G equidox

COPY --from=builder /app/public ./public
COPY --from=builder --chown=equidox:equidox /app/.next/standalone ./
COPY --from=builder --chown=equidox:equidox /app/.next/static ./.next/static

USER equidox

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
