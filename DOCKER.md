# Self-Hosting with Docker and Multi-Provider Support

This guide covers Docker-based self-hosting of Sim Studio with support for multiple Copilot providers.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/simstudioai/sim.git
cd sim

# Copy environment example
cp apps/sim/.env.example .env

# Configure your environment
nano .env  # Or use your preferred editor

# Build with parallel builds (recommended for faster builds)
docker compose -f docker-compose.selfhost.yml build --parallel

# Start services
docker compose -f docker-compose.selfhost.yml up -d
```

**Note:** Use `--parallel` flag with `docker compose build` to build all services simultaneously, reducing total build time significantly.

Access the application at [http://localhost:3000](http://localhost:3000/)

## Required Environment Variables

The following variables are required for all deployments:

| Variable | Required | Description |
|-----------|-------------|-----------|
| `DATABASE_URL` | Yes | PostgreSQL connection string with pgvector |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (generate: `openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | Yes | Encryption key (generate: `openssl rand -hex 32`) |
| `INTERNAL_API_SECRET` | Yes | Internal API secret (generate: `openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (e.g., `http://localhost:3000`) |

## Copilot/AI Provider Configuration

Choose one of the following providers:

| Provider | Environment Variables | Description |
|-----------|---------------------|-------------|
| **sim** (default) | `COPILOT_API_KEY` | Sim.ai managed service |
| **openai-compatible** | `COPILOT_PROVIDER=openai-compatible`<br>`COPILOT_BASE_URL`<br>`COPILOT_API_KEY` | OpenAI-compatible APIs (Z.AI, custom OpenAI servers) |
| **z-ai** | `COPILOT_PROVIDER=z-ai`<br>`COPILOT_API_KEY` | Z.AI specifically (alias for openai-compatible) |
| **mistral** | `COPILOT_PROVIDER=mistral`<br>`MISTRAL_API_KEY` or `COPILOT_API_KEY` | Mistral AI direct API |
| **azure-openai** | `COPILOT_PROVIDER=azure-openai`<br>`AZURE_OPENAI_API_KEY`<br>`AZURE_OPENAI_ENDPOINT` | Azure OpenAI Service |
| **vertex** | `COPILOT_PROVIDER=vertex`<br>`VERTEX_PROJECT`<br>`VERTEX_LOCATION`<br>`COPILOT_API_KEY` | Google Vertex AI |

### Provider-Specific Models

The `COPILOT_MODEL` environment variable allows you to specify the default model for each provider:

- **sim**: `claude-3-7-sonnet-latest` (default)
- **openai-compatible/z-ai**: `gpt-4o` (default for Z.AI)
- **mistral**: `mistral-large-latest` (default)
- **azure-openai**: `azure/gpt-4o` (default)
- **vertex**: `vertex/gemini-2.5-pro` (default)

### Example Configurations

#### Using Z.AI (OpenAI-compatible)

```env
# .env file
COPILOT_PROVIDER=openai-compatible
COPILOT_BASE_URL=https://api.z.ai/v1
COPILOT_API_KEY=your_zai_api_key_here
COPILOT_MODEL=gpt-4o
```

#### Using Mistral Direct API

```env
# .env file
COPILOT_PROVIDER=mistral
MISTRAL_API_KEY=your_mistral_api_key_here  # Or use COPILOT_API_KEY
MISTRAL_MODEL=mistral-large-latest  # Optional: Default model (default: mistral-large-latest)
```

#### Using Sim.ai (default managed service)

```env
# .env file
COPILOT_PROVIDER=sim
COPILOT_API_KEY=your_sim_ai_api_key_here
```

## Docker Service Management

```bash
# View logs
docker compose -f docker-compose.selfhost.yml logs -f

# Stop services
docker compose -f docker-compose.selfhost.yml down

# Restart services
docker compose -f docker-compose.selfhost.yml restart

# Rebuild after code changes
docker compose -f docker-compose.selfhost.yml up --build -d

# Rebuild all services in parallel (faster)
docker compose -f docker-compose.selfhost.yml build --parallel
docker compose -f docker-compose.selfhost.yml up -d

# Rebuild specific service
docker compose -f docker-compose.selfhost.yml build simstudio
docker compose -f docker-compose.selfhost.yml up -d simstudio
```

## Health Check

Monitor provider configuration and health status:

```bash
curl http://localhost:3000/api/health
```

Expected response for a healthy configuration:

```json
{
  "status": "healthy",
  "provider": "openai-compatible",
  "model": "gpt-4o",
  "configured": true,
  "config": {
    "hasApiKey": true,
    "hasBaseUrl": true
  }
}
```

## Using Local AI Models

### Ollama

If using Ollama, the `OLLAMA_URL` environment variable needs to point to `host.docker.internal` when running in Docker:

```bash
# Docker Desktop (macOS/Windows)
OLLAMA_URL=http://host.docker.internal:11434 docker compose -f docker-compose.selfhost.yml up -d

# Linux (add extra_hosts or use host IP)
docker compose -f docker-compose.selfhost.yml up -d
# Then set OLLAMA_URL to your host's IP
```

### vLLM

Sim also supports [vLLM](https://docs.vllm.ai/) for self-hosted models with OpenAI-compatible API:

```bash
# Set these environment variables
VLLM_BASE_URL=http://your-vllm-server:8000
VLLM_API_KEY=your_optional_api_key  # Only if your vLLM instance requires auth
```

When running with Docker, use `host.docker.internal` if vLLM is on your host machine (same as Ollama above).

## Troubleshooting

### Database connection issues

- Ensure PostgreSQL has the pgvector extension installed. When using Docker, wait for the database to be healthy before running migrations.
- Check that the `DATABASE_URL` in your `.env` file includes the correct database name (`simstudio` by default).

### Ollama models not showing in dropdown (Docker)

If you're running Ollama on your host machine and Sim in Docker, change `OLLAMA_URL` from `localhost` to `host.docker.internal`:

```bash
# Docker Desktop (macOS/Windows)
OLLAMA_URL=http://host.docker.internal:11434 docker compose -f docker-compose.selfhost.yml up -d

# Linux (use actual IP)
docker compose -f docker-compose.selfhost.yml up -d  # Then set OLLAMA_URL to your host's IP
```

### Using an External Ollama Instance

If you already have Ollama running on your host machine (outside Docker), you need to configure `OLLAMA_URL` to use `host.docker.internal` instead of `localhost`:

```bash
# Docker Desktop (macOS/Windows)
OLLAMA_URL=http://host.docker.internal:11434 docker compose -f docker-compose.selfhost.yml up -d

# Linux (add extra_hosts or use host IP)
docker compose -f docker-compose.selfhost.yml up -d  # Then set OLLAMA_URL to your host's IP
```

### Port conflicts

If ports 3000, 3002, or 5432 are in use, configure alternatives:

```bash
# Custom ports
NEXT_PUBLIC_APP_URL=http://localhost:3100 POSTGRES_PORT=5433 docker compose -f docker-compose.selfhost.yml up -d
```

## Docker Architecture Overview

The self-hosted Docker configuration follows the official Sim project architecture with three separate services, each with a distinct responsibility:

### Service Separation Pattern

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Docker Compose Self-Hosting                         │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   Browser / API Client                             │  │
│  │                        │                                           │  │
│  │      ┌─────────────────┴─────────────────┐                         │  │
│  │      │                                   │                         │  │
│  │      ▼                                   ▼                         │  │
│  │  ┌─────────────────┐             ┌─────────────────┐              │  │
│  │  │   Next.js App   │◄────────────┤  Realtime/     │              │  │
│  │  │   Port: 3000    │   Socket    │  Socket.io     │              │  │
│  │  │                 │             │  Port: 3002     │              │  │
│  │  └────────┬────────┘             └────────┬────────┘              │  │
│  │           │                               │                        │  │
│  │           │                               │                        │  │
│  │           ▼                               │                        │  │
│  │  ┌─────────────────┐                      │                        │  │
│  │  │  PostgreSQL     │◄─────────────────────┘                        │  │
│  │  │  pgvector      │                                             │  │
│  │  │  Port: 5432     │                                             │  │
│  │  └─────────────────┘                                             │  │
│  │           ▲                                                       │  │
│  │           │                                                       │  │
│  │  ┌────────┴────────┐                                             │  │
│  │  │   Migrations    │ (one-time, ephemeral)                      │  │
│  │  │   (runs & exits)│                                             │  │
│  │  └─────────────────┘                                             │  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Service Details

| Service | Dockerfile | Purpose | Memory Limit | Restart Policy |
|---------|-----------|---------|--------------|----------------|
| **simstudio** | `docker/app.Dockerfile` | Next.js application main server | 8GB | `unless-stopped` |
| **realtime** | `docker/realtime.Dockerfile` | Socket.io real-time communication | 4GB | `unless-stopped` |
| **migrations** | `docker/db.Dockerfile` | Database schema migrations | N/A | `no` (ephemeral) |
| **db** | `pgvector/pgvector:pg17` | PostgreSQL with pgvector extension | N/A | `always` |

### Why This Separation Matters

1. **Resource Efficiency**: Each service can be scaled independently. The heavy Next.js build (8GB) doesn't impact the lightweight Socket.io service (4GB).

2. **Faster Iteration**: Changes to the real-time service don't require rebuilding the entire Next.js application.

3. **Better Debugging**: Issues can be isolated to specific services, making troubleshooting easier.

4. **Matches Official Pattern**: Following the upstream Sim project architecture ensures easier upgrades and compatibility.

## Build Configuration

### Turbopack Disabled for Docker Builds

The Docker build explicitly disables Turbopack (`TURBOPACK=0`) to prevent build hanging issues with Next.js 16+:

```dockerfile
ENV TURBO_TELEMETRY_DISABLED=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    VERCEL_TELEMETRY_DISABLED=1 \
    DOCKER_BUILD=1

RUN --mount=type=cache,id=turbo-cache,target=/app/.turbo \
    --mount=type=cache,id=nextjs-cache,target=/app/apps/sim/.next/cache \
    TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=7168" \
    turbo run build --filter=sim
```

**Why?**
- Turbopack in Next.js 16 canary has known stability issues with containerized builds
- Traditional webpack builds are more stable and predictable in Docker environments
- 30-minute build timeout is sufficient with proper resource allocation

### Build Optimization Strategy

The Docker build uses aggressive multi-stage caching to significantly reduce build times:

#### Stage 1: Dependencies (Aggressive Caching)

```dockerfile
# Install turbo globally first (separate layer for better caching)
RUN --mount=type=cache,id=bun-global,target=/root/.bun/install/cache \
    bun install -g turbo

# Install dependencies with aggressive caching
RUN --mount=type=cache,id=bun-deps,target=/root/.bun/install/cache \
    --mount=type=cache,id=npm-cache,target=/root/.npm \
    HUSKY=0 bun install --omit=dev --ignore-scripts --linker=hoisted

# Rebuild isolated-vm for Node.js 22 (native module)
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    cd node_modules/isolated-vm && npx node-gyp rebuild --release
```

**Cache keys:**
- `bun-global`: Caches global Bun packages (turbo)
- `bun-deps`: Caches dependency installs
- `npm-cache`: Caches npm native modules (isolated-vm rebuild)

#### Stage 2: Build (Incremental with Turbo Cache)

```dockerfile
RUN --mount=type=cache,id=turbo-cache,target=/app/.turbo \
    --mount=type=cache,id=nextjs-cache,target=/app/apps/sim/.next/cache \
    TURBOPACK=0 NODE_OPTIONS="--max-old-space-size=7168" \
    turbo run build --filter=sim
```

**Cache keys:**
- `turbo-cache`: Caches turbo build artifacts across builds (incremental builds)
- `nextjs-cache`: Caches Next.js build cache for incremental rebuilds

### Parallel Builds

Build multiple services simultaneously using Docker Compose:

```bash
# Build all services in parallel (reduces total build time by ~13%)
docker compose -f docker-compose.selfhost.yml build --parallel
```

**Build time comparison:**
| Method | simstudio | realtime | Total |
|--------|-----------|-----------|--------|
| Sequential | 20 min | 3 min | **23 min** |
| Parallel | 20 min | 3 min (concurrent) | **20 min** ✅ |

**Note:** BuildKit inline cache is enabled via `BUILDKIT_INLINE_CACHE=1` in docker-compose.selfhost.yml for remote cache support.

### Caching Tips

1. **First build is slow** (20+ minutes) - Docker downloads all dependencies
2. **Subsequent builds are fast** (2-5 minutes) - Only changed packages are rebuilt
3. **Clear cache** if needed: `docker builder prune -a`
4. **Use parallel builds** for maximum speed
5. **Cache is preserved across container rebuilds** as long as dependencies don't change

### Resource Constraints

The following memory constraints are configured to ensure stable builds:

```yaml
simstudio:
  deploy:
    resources:
      limits:
        memory: 8G

realtime:
  deploy:
    resources:
      limits:
        memory: 4G
```

- **7168MB** (7GB) heap size for Node.js build process
- **8GB** container memory limit for simstudio
- **4GB** container memory limit for realtime service

### Multi-Stage Build Optimization

The Dockerfiles use multi-stage builds for efficient layer caching:

1. **Base Stage**: Installs Node.js 22, Python, ffmpeg, and system dependencies
2. **Deps Stage**: Installs npm/bun dependencies (cached when dependencies unchanged)
3. **Builder Stage**: Compiles the Next.js application with turbo cache
4. **Runner Stage**: Minimal runtime image with only production artifacts

## Dockerfile Structure

### docker/app.Dockerfile

Main Next.js application server. Key features:

- Multi-stage build with layer caching
- Turbopack disabled for stability
- Node.js 22 with isolated-vm native module
- Python venv for PII validation guardrails
- Standalone output for minimal runtime image

### docker/realtime.Dockerfile

Socket.io real-time communication server. Key features:

- Lightweight Alpine-based build
- Direct execution of socket server
- Health endpoint at `/health` for healthchecks
- Minimal dependencies (only socket server requirements)

### docker/db.Dockerfile

Database migration runner. Key features:

- Ephemeral container (runs migrations and exits)
- Minimal dependencies (only database package)
- No runtime server - purely for migrations

## Docker Compose Configuration

### Health Checks

Each service has health checks for proper startup sequencing:

```yaml
simstudio:
  healthcheck:
    test: ['CMD', 'wget', '--spider', '--quiet', 'http://127.0.0.1:3000']
    interval: 90s
    timeout: 5s
    retries: 3
    start_period: 10s

realtime:
  healthcheck:
    test: ['CMD', 'wget', '--spider', '--quiet', 'http://127.0.0.1:3002/health']
    interval: 90s
    timeout: 5s
    retries: 3
    start_period: 10s

db:
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U postgres']
    interval: 5s
    timeout: 5s
    retries: 5
```

### Dependency Chain

Services start in this order:

1. **db** → Wait for PostgreSQL to be healthy
2. **migrations** → Wait for db, run migrations, exit
3. **realtime** → Wait for db, start socket server
4. **simstudio** → Wait for db, migrations, and realtime

## Migration from Single-Container Setup

If you were previously using `docker/Dockerfile.selfhost`:

**Removed:**
- ❌ Single monolithic container
- ❌ Entrypoint script with embedded migrations
- ❌ Node.js 20 (upgraded to Node.js 22)
- ❌ Build-time Turbopack (disabled for stability)

**Added:**
- ✅ Three separate services (app, realtime, migrations)
- ✅ Ephemeral migrations service
- ✅ Independent health checks
- ✅ Official pattern compatibility

## Docker Architecture Overview (Legacy Reference)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Docker Compose Self-Hosting                  │
│                                                              │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                                                   │   │
│  │         Browser                              │   │
│  │              ────────┐                      │   │
│  │                        │                      │   │
│  ▼                        │                      │   │
│  │  Copilot Chat API        │   │
│  │         │                      │   │
│  │         │                      │   │
│  └────────────────────────┴          │   │
│  │                                                   │   │
│  ┌───────────────────────┐   ┌───────────────────────┐   │
│  │   Next.js App (port 3000) │   │ PostgreSQL (pgvector)     │   │
│  │                           │   │  Port: 5432         │   │
│  └───────────────────────┘   └───────────────────────┘   │
│                                                   │   │
│  ┌───────────────────────┐   ┌───────────────────────┐   │
│  │  Realtime Socket (port 3002)  │   │ Migrations (one-time)     │   │
│  │                           │   │                           │   │
│  └───────────────────────┘   └───────────────────────┘   │
│                                                   │   │
└─────────────────────────────────────────────────────────────────────┘
│         Docker Host / VM                                  │
│                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Comparison: Cloud vs Self-Hosted

| Feature | Cloud (sim.ai) | Self-Hosted (Docker) |
|---------|-------------------|----------------------|
| Copilot API | Managed by sim.ai | Your choice of provider (Z.AI, Mistral, etc.) |
| AI Models | Fixed set | Local Ollama/vLLM integration |
| Data Privacy | Data stays on sim.ai servers | Data stays on your servers |
| Updates | Automatic | You control when to update |
| Cost | Subscription-based | Your infrastructure costs |
| Scalability | Unlimited | Limited by your resources |
