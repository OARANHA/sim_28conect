#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Sim Studio Self-Hosted Startup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ========================================
# Required Environment Variables
# ========================================
REQUIRED_VARS=(
  "DATABASE_URL"
  "BETTER_AUTH_SECRET"
  "ENCRYPTION_KEY"
  "INTERNAL_API_SECRET"
)

# ========================================
# Check Required Variables
# ========================================
missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo -e "${RED}ERROR: Missing required environment variables:${NC}"
  for var in "${missing_vars[@]}"; do
    echo -e "${RED}  - $var${NC}"
  done
  echo ""
  echo -e "${YELLOW}Please set these variables in your .env file or Docker Compose configuration.${NC}"
  exit 1
fi

# ========================================
# Check Copilot Provider Configuration
# ========================================
echo -e "${GREEN}Checking Copilot provider configuration...${NC}"

COPILOT_PROVIDER="${COPILOT_PROVIDER:-sim}"

case "$COPILOT_PROVIDER" in
  sim)
    if [ -z "$COPILOT_API_KEY" ]; then
      echo -e "${YELLOW}WARNING: COPILOT_API_KEY not set for 'sim' provider. Some Copilot features may be limited.${NC}"
    else
      echo -e "${GREEN}✓ Copilot provider: sim${NC}"
    fi
    ;;
    
  openai-compatible)
    if [ -z "$COPILOT_BASE_URL" ]; then
      echo -e "${RED}ERROR: COPILOT_BASE_URL is required for 'openai-compatible' provider${NC}"
      exit 1
    fi
    if [ -z "$COPILOT_API_KEY" ]; then
      echo -e "${RED}ERROR: COPILOT_API_KEY is required for 'openai-compatible' provider${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Copilot provider: openai-compatible${NC}"
    echo -e "  Base URL: $COPILOT_BASE_URL"
    echo -e "  Model: ${COPILOT_MODEL:-claude-3-7-sonnet-latest}"
    ;;
    
  z-ai)
    if [ -z "$COPILOT_API_KEY" ]; then
      echo -e "${RED}ERROR: COPILOT_API_KEY is required for 'z-ai' provider${NC}"
      exit 1
    fi
    COPILOT_BASE_URL="${COPILOT_BASE_URL:-https://api.z.ai/v1}"
    echo -e "${GREEN}✓ Copilot provider: z-ai${NC}"
    echo -e "  Base URL: $COPILOT_BASE_URL"
    echo -e "  Model: ${COPILOT_MODEL:-gpt-4o}"
    ;;
    
  mistral)
    if [ -z "$MISTRAL_API_KEY" ] && [ -z "$COPILOT_API_KEY" ]; then
      echo -e "${RED}ERROR: MISTRAL_API_KEY or COPILOT_API_KEY is required for 'mistral' provider${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Copilot provider: mistral${NC}"
    echo -e "  Model: ${COPILOT_MODEL:-mistral-large-latest}"
    ;;
    
  azure-openai)
    if [ -z "$AZURE_OPENAI_API_KEY" ] || [ -z "$AZURE_OPENAI_ENDPOINT" ]; then
      echo -e "${RED}ERROR: AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are required for 'azure-openai' provider${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Copilot provider: azure-openai${NC}"
    ;;
    
  vertex)
    if [ -z "$VERTEX_PROJECT" ] || [ -z "$VERTEX_LOCATION" ]; then
      echo -e "${RED}ERROR: VERTEX_PROJECT and VERTEX_LOCATION are required for 'vertex' provider${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓ Copilot provider: vertex${NC}"
    ;;
    
  *)
    echo -e "${YELLOW}WARNING: Unknown provider '$COPILOT_PROVIDER'. Using default configuration.${NC}"
    ;;
esac

# ========================================
# Optional Variables Check
# ========================================
echo ""
echo -e "${GREEN}Optional configurations:${NC}"

if [ -n "$REDIS_URL" ]; then
  echo -e "  ${GREEN}✓${NC} Redis caching enabled"
else
  echo -e "  - Redis caching not configured (optional)"
fi

if [ -n "$RESEND_API_KEY" ]; then
  echo -e "  ${GREEN}✓${NC} Email provider (Resend) configured"
else
  echo -e "  - Email provider not configured (emails will be logged to console)"
fi

if [ -n "$OLLAMA_URL" ]; then
  echo -e "  ${GREEN}✓${NC} Local Ollama: $OLLAMA_URL"
fi

if [ -n "$VLLM_BASE_URL" ]; then
  echo -e "  ${GREEN}✓${NC} Self-hosted vLLM: $VLLM_BASE_URL"
fi

# ========================================
# Wait for Database
# ========================================
echo ""
echo -e "${GREEN}Waiting for database to be ready...${NC}"

# Extract database host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/' | sed 's|/.*||')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/')
DB_PORT=${DB_PORT:-5432}

MAX_RETRIES=30
RETRY_DELAY=2

for i in $(seq 1 $MAX_RETRIES); do
  if PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$DB_HOST" -p "$DB_PORT" -U "${POSTGRES_USER:-postgres}" -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✓ Database is ready${NC}"
    break
  else
    echo -e "${YELLOW}Waiting for database... ($i/$MAX_RETRIES)${NC}"
    sleep $RETRY_DELAY
  fi
done

if [ $i -gt $MAX_RETRIES ]; then
  echo -e "${RED}ERROR: Database did not become ready after $MAX_RETRIES attempts${NC}"
  exit 1
fi

# ========================================
# Run Migrations
# ========================================
echo ""
echo -e "${GREEN}Running database migrations...${NC}"
cd /app/packages/db
bun run db:migrate
echo -e "${GREEN}✓ Migrations completed${NC}"

# ========================================
# Start Application
# ========================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Starting Sim Studio${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Execute the command passed to this script
exec "$@"
