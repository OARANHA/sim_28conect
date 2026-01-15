# ========================================
# Base Stage: Debian-based Bun with Node.js 22
# ========================================
FROM oven/bun:1.3.3-slim AS base

# Install Node.js 22 and common dependencies once in base stage
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv make g++ curl ca-certificates bash ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Install timeout command for Windows Docker Desktop compatibility
RUN apt-get update && apt-get install -y --no-install-recommends coreutils

# ========================================
# Dependencies Stage: Install Dependencies
# ========================================
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock turbo.json ./
RUN mkdir -p apps packages/db packages/testing packages/logger packages/tsconfig
COPY apps/sim/package.json ./apps/sim/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/testing/package.json ./packages/testing/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json

# Install turbo globally first (separate layer for better caching)
RUN --mount=type=cache,id=bun-global,target=/root/.bun/install/cache \
    bun install -g turbo

# Install dependencies with aggressive caching (omit=dev for smaller production image)
RUN --mount=type=cache,id=bun-deps,target=/root/.bun/install/cache \
    --mount=type=cache,id=npm-cache,target=/root/.npm \
    HUSKY=0 bun install --omit=dev --ignore-scripts --linker=hoisted

# Rebuild isolated-vm for Node.js 22 (native module)
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    cd node_modules/isolated-vm && npx node-gyp rebuild --release

# ========================================
# Builder Stage: Build the Application
# ========================================
FROM base AS builder
WORKDIR /app

# Install turbo globally (cached for fast reinstall)
RUN --mount=type=cache,id=bun-cache,target=/root/.bun/install/cache \
    bun install -g turbo

# Copy node_modules from deps stage (cached if dependencies don't change)
COPY --from=deps /app/node_modules ./node_modules

# Copy package configuration files (needed for build)
COPY package.json bun.lock turbo.json ./
COPY apps/sim/package.json ./apps/sim/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/testing/package.json ./packages/testing/package.json
COPY packages/logger/package.json ./packages/logger/package.json

# Copy workspace configuration files (needed for turbo)
COPY apps/sim/next.config.ts ./apps/sim/next.config.ts
COPY apps/sim/tsconfig.json ./apps/sim/tsconfig.json
COPY apps/sim/tailwind.config.ts ./apps/sim/tailwind.config.ts
COPY apps/sim/postcss.config.mjs ./apps/sim/postcss.config.mjs

# Copy source code (changes most frequently - placed last to maximize cache hits)
COPY apps/sim ./apps/sim
COPY packages ./packages

# Required for standalone nextjs build
WORKDIR /app/apps/sim
RUN --mount=type=cache,id=bun-cache,target=/root/.bun/install/cache \
    HUSKY=0 bun install sharp --linker=hoisted

ENV NEXT_TELEMETRY_DISABLED=1 \
    VERCEL_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    DOCKER_BUILD=1

WORKDIR /app

# Provide dummy database URLs during image build so server code that imports @sim/db
# can be evaluated without crashing. Runtime environments should override these.
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/dummy"
ENV DATABASE_URL=${DATABASE_URL}

# Provide dummy NEXT_PUBLIC_APP_URL for build-time evaluation
# Runtime environments should override this with the actual URL
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# ========================================
# CRITICAL FIX: Force Webpack in Next.js 16 (disable Turbopack)
# Next.js 16 canary Turbopack has stability issues in Docker on Windows
# Solution: Add turbo: false to experimental section in next.config.ts
# ========================================
RUN cd apps/sim && \
    bash -c 'echo "    turbo: false" >> next.config.ts'

# Build with Next.js 16 + Webpack (NOT Turbopack)
# Increased memory: 8192MB (from 7168MB)
# Increased timeout: 1200s (20 min, from 600s)
# Cache mounts for turbo and nextjs (disabled problematic local cache)
RUN --mount=type=cache,id=turbo,target=/app/.turbo \
    --mount=type=cache,id=next,target=/app/apps/sim/.next/cache \
    NODE_OPTIONS="--max-old-space-size=8192" \
    NEXT_TURBO=0 \
    TURBOPACK=0 \
    NEXT_PRIVATE_DISABLE_TURBOPACK=1 \
    timeout 1200 bash -c \
    'bun run build --filter=sim' || \
    (echo "BUILD FAILED - Next.js 16 Turbopack is unstable in Docker" && exit 1)

# ========================================
# Runner Stage: Run the actual app
# ========================================

FROM base AS runner
WORKDIR /app

# Node.js 22, Python, ffmpeg, etc. are already installed in base stage
ENV NODE_ENV=production

# Create non-root user and group
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs nextjs

# Copy application artifacts from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/sim/public ./apps/sim/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/sim/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/sim/.next/static ./apps/sim/.next/static

# Copy isolated-vm native module (compiled for Node.js in deps stage)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/isolated-vm ./node_modules/isolated-vm

# Copy the isolated-vm worker script
COPY --from=builder --chown=nextjs:nodejs /app/apps/sim/lib/execution/isolated-vm-worker.cjs ./apps/sim/lib/execution/isolated-vm-worker.cjs

# Guardrails setup with pip caching
COPY --from=builder --chown=nextjs:nodejs /app/apps/sim/lib/guardrails/requirements.txt ./apps/sim/lib/guardrails/requirements.txt
COPY --from=builder --chown=nextjs:nodejs /app/apps/sim/lib/guardrails/validate_pii.py ./apps/sim/lib/guardrails/validate_pii.py

# Install Python dependencies with pip cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.cache/pip \
    python3 -m venv ./apps/sim/lib/guardrails/venv && \
    ./apps/sim/lib/guardrails/venv/bin/pip install --upgrade pip && \
    ./apps/sim/lib/guardrails/venv/bin/pip install -r ./apps/sim/lib/guardrails/requirements.txt && \
    chown -R nextjs:nodejs /app/apps/sim/lib/guardrails

# Create .next/cache directory with correct ownership
RUN mkdir -p apps/sim/.next/cache && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

CMD ["bun", "apps/sim/server.js"]