# syntax=docker/dockerfile:1

# ---- Build stage: compile the Next.js app ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-slim AS runner
WORKDIR /app
# Listen on 8080 — Fly.io routes to this port by default, and fly.toml's
# internal_port matches. Next.js `next start` binds whatever $PORT says.
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Production dependencies only. tsx is a runtime dependency here because the
# background data sync (scripts/sync.ts) runs through it inside the container.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App build output plus the pieces the sync CLI needs at runtime.
COPY --from=build /app/.next ./.next
COPY next.config.mjs tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

# Mount point for the Fly volume that holds the SQLite DB + player cache.
RUN mkdir -p /data

EXPOSE 8080
ENTRYPOINT ["/bin/sh", "scripts/docker-entrypoint.sh"]
