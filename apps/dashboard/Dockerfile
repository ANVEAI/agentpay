# syntax=docker/dockerfile:1

# ---- Builder: install deps, build the SDK, then the dashboard (standalone) ----
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /repo

# Copy manifests first for better layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/merchant-sdk/package.json ./packages/merchant-sdk/
COPY apps/dashboard/package.json ./apps/dashboard/
RUN pnpm install

# Copy sources and build.
COPY . .
ARG NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
ENV NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @agentpay/merchant-sdk build \
 && pnpm --filter @agentpay/dashboard build

# ---- Runner: minimal image with just the standalone server ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /repo/apps/dashboard/.next/standalone ./
COPY --from=builder /repo/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder /repo/apps/dashboard/public ./apps/dashboard/public

EXPOSE 3000
CMD ["node", "apps/dashboard/server.js"]
