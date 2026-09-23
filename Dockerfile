# 1. Base image with Node 22 Alpine
FROM node:22-alpine AS base

# 2. Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# 3. Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG BASE_PATH=/space-edu-3d
ARG NEXT_PUBLIC_BASE_PATH=/space-edu-3d
ENV BASE_PATH=$BASE_PATH
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
RUN npm run build

# 4. Production Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV BASE_PATH=/space-edu-3d
ENV NEXT_PUBLIC_BASE_PATH=/space-edu-3d

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets and public directory (with all 3D assets and Smithsonian scans)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
