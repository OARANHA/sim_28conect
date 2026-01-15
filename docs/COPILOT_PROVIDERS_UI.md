# Copilot Provider Selector UI

## Overview

This feature adds a visual interface to view and select different Copilot LLM providers in the Sim chat interface. It complements the existing backend multi-provider support implemented by the agent `roo`.

## Architecture

```
┌─────────────────────────────────────────┐
│  Chat Header (UI)                       │
│  ┌───────────────────────────────────┐  │
│  │  ProviderSelector Component       │  │
│  │  - Dropdown with providers        │  │
│  │  - Configuration status badges    │  │
│  │  - Model information tooltips     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓ API Call
┌─────────────────────────────────────────┐
│  GET /api/copilot/providers             │
│  - Returns current provider             │
│  - Lists all available providers        │
│  - Shows configuration status           │
└─────────────────────────────────────────┘
              ↓ Reads
┌─────────────────────────────────────────┐
│  Provider Factory (Backend)             │
│  apps/sim/lib/copilot/providers/index.ts│
│  - getProviderConfig()                  │
│  - validateProviderConfig()             │
│  - getProviderInfo()                    │
└─────────────────────────────────────────┘
              ↓ Uses
┌─────────────────────────────────────────┐
│  Environment Variables (.env)           │
│  COPILOT_PROVIDER=sim                   │
│  COPILOT_API_KEY=...                    │
│  COPILOT_MODEL=...                      │
└─────────────────────────────────────────┘
```

## Components Created

### 1. API Route: `/api/copilot/providers`
**File:** `apps/sim/app/api/copilot/providers/route.ts`

**Purpose:** Provides provider information to the frontend

**Response Format:**
```json
{
  "current": {
    "provider": "sim",
    "model": "claude-3-7-sonnet-latest",
    "configured": true
  },
  "available": [
    {
      "id": "sim",
      "name": "Sim.ai",
      "description": "Managed Copilot service by Sim.ai",
      "requiresApiKey": true,
      "requiresBaseUrl": false,
      "isConfigured": true,
      "models": [
        "claude-3-7-sonnet-latest",
        "claude-3-5-sonnet-latest",
        "gpt-4o",
        "gpt-4o-mini"
      ]
    },
    // ... other providers
  ]
}
```

### 2. React Component: `ProviderSelector`
**File:** `apps/sim/components/copilot/provider-selector.tsx`

**Features:**
- 📋 Dropdown list of all available providers
- ✅ Visual badges showing configuration status (Active/Ready/Setup Required)
- 📊 Tooltips displaying available models per provider
- ⚠️ Warnings for missing configuration (API keys, base URLs)
- 🔄 Real-time loading state
- ℹ️ Current configuration info tooltip

**UI States:**
- **Active** (green badge): Provider is configured and currently selected
- **Ready** (green badge): Provider is configured but not selected
- **Setup Required** (gray badge): Missing required configuration
- **Not Configured** (orange badge): Provider needs setup

### 3. Header Integration
**File:** `apps/sim/app/chat/components/header/header.tsx`

**Changes:**
- Imported `ProviderSelector` component
- Added selector between chat title and GitHub/Sim links
- Hidden on mobile (shows only on `lg` breakpoint and above)
- Only visible when no custom branding is set

## Supported Providers

### 1. Sim.ai (Default)
**Provider ID:** `sim`

**Required Environment Variables:**
```bash
COPILOT_PROVIDER=sim
COPILOT_API_KEY=your_sim_api_key
COPILOT_MODEL=claude-3-7-sonnet-latest  # optional
```

**Get API Key:** https://sim.ai → Settings → Copilot

---

### 2. Z.AI
**Provider ID:** `z-ai`

**Required Environment Variables:**
```bash
COPILOT_PROVIDER=z-ai
COPILOT_API_KEY=your_zai_api_key
COPILOT_BASE_URL=https://api.z.ai/v1  # optional, defaults to Z.AI
COPILOT_MODEL=claude-3-7-sonnet-latest  # optional
```

---

### 3. OpenAI Compatible
**Provider ID:** `openai-compatible`

**Required Environment Variables:**
```bash
COPILOT_PROVIDER=openai-compatible
COPILOT_API_KEY=your_api_key
COPILOT_BASE_URL=https://your-server.com/v1  # REQUIRED
COPILOT_MODEL=your-model-name  # optional
```

**Use Cases:**
- Self-hosted LLM servers (vLLM, Ollama with OpenAI compatibility)
- Alternative OpenAI-compatible providers
- Custom inference endpoints

---

### 4. Mistral AI
**Provider ID:** `mistral`

**Required Environment Variables:**
```bash
COPILOT_PROVIDER=mistral
MISTRAL_API_KEY=your_mistral_key  # or COPILOT_API_KEY
COPILOT_MODEL=mistral-large-latest  # optional
```

**Get API Key:** https://console.mistral.ai/

---

### 5. Azure OpenAI
**Provider ID:** `azure-openai`

**Required Environment Variables:**
```bash
COPILOT_PROVIDER=azure-openai
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-02-15-preview  # optional
COPILOT_MODEL=gpt-4o  # optional
```

---

### 6. Google Vertex AI
**Provider ID:** `vertex`

**Required Environment Variables:**
```bash
COPILOT_PROVIDER=vertex
VERTEX_PROJECT=your-gcp-project-id
VERTEX_LOCATION=us-central1  # or your preferred region
COPILOT_API_KEY=your_gcp_credentials  # optional
COPILOT_MODEL=gemini-1.5-pro  # optional
```

---

## How to Use

### Step 1: Configure Environment Variables

1. Open your `.env` file in the `apps/sim/` directory
2. Set your desired provider and credentials:

```bash
# Example: Using Z.AI
COPILOT_PROVIDER=z-ai
COPILOT_API_KEY=zai_your_api_key_here
COPILOT_MODEL=claude-3-7-sonnet-latest
```

### Step 2: Restart Your Application

**If using Docker:**
```bash
docker compose -f docker-compose.selfhost.yml restart
```

**If using manual setup:**
```bash
# Stop current server (Ctrl+C)
bun run dev:full
```

### Step 3: Verify Provider in UI

1. Open your Sim chat interface
2. Look for the **ProviderSelector** dropdown in the header (between chat title and GitHub link)
3. Click the dropdown to see all available providers
4. Current provider will show an **"Active"** badge
5. Configured providers show **"Ready"** badge
6. Unconfigured providers show **"Setup Required"** badge

### Step 4: Check Configuration Status

Click the **ℹ️ info icon** next to the provider selector to see:
- Current provider name
- Active model
- Configuration status

---

## Current Limitations

### ⚠️ Provider Selection Requires Restart

The current implementation is **display-only**. When you select a different provider from the dropdown:

1. An alert appears with instructions
2. You must manually update the `.env` file
3. Application restart is required

**Why?** Environment variables are loaded at application startup and cannot be changed at runtime without additional infrastructure.

---

## Future Enhancements

### Phase 1: Database-Backed Configuration (Planned)

Move provider configuration from environment variables to database:

- **Table:** `copilot_provider_configs`
- **Benefits:**
  - Change providers without restart
  - Per-user provider preferences
  - A/B testing between providers
  - Provider usage analytics

### Phase 2: Runtime Provider Switching (Planned)

Implement dynamic provider switching:

```typescript
// Example: Switch provider on-the-fly
POST /api/copilot/providers/switch
{
  "provider": "mistral",
  "apiKey": "encrypted_key"
}
```

### Phase 3: Multi-Provider Fallback (Planned)

Automatic fallback to alternative providers:

- Primary provider fails → Automatically try secondary
- Load balancing between multiple providers
- Cost optimization (use cheaper provider when possible)

### Phase 4: Settings Page (Planned)

Dedicated settings UI:

- **Path:** `/settings/copilot`
- **Features:**
  - Form to input API keys
  - Test provider connection
  - Save multiple provider configurations
  - Set default provider
  - View usage statistics per provider

---

## Troubleshooting

### Provider shows "Not Configured"

**Solution:**
1. Check your `.env` file has the required variables
2. Ensure API key is valid
3. For `openai-compatible`, verify `COPILOT_BASE_URL` is set
4. Restart the application after .env changes

### Dropdown doesn't appear in chat header

**Possible Causes:**
1. **Custom branding enabled** - Selector only shows when `brand.logoUrl` is not set
2. **Screen too small** - Hidden on mobile (< 1024px width)
3. **Component import failed** - Check browser console for errors

### API returns 500 error

**Solution:**
1. Check server logs for detailed error
2. Verify `getProviderInfo()` function in `apps/sim/lib/copilot/providers/index.ts`
3. Ensure environment variables are accessible in API route

### Provider selection doesn't actually switch

**Expected Behavior:**
Currently, this is normal. You'll see an alert asking you to:
1. Update `.env` file with new provider
2. Restart the application

This will be improved in future versions with runtime switching.

---

## Testing

### Manual Testing Checklist

- [ ] Provider dropdown displays all 6 providers
- [ ] Current provider shows "Active" badge
- [ ] Configured providers show "Ready" badge
- [ ] Unconfigured providers show "Setup Required" badge
- [ ] Tooltips display correct model lists
- [ ] Info tooltip shows current configuration
- [ ] Responsive design works (hidden on mobile)
- [ ] No console errors
- [ ] API endpoint returns valid JSON
- [ ] Provider selection shows alert with instructions

### Testing Different Providers

**Test Sim.ai:**
```bash
COPILOT_PROVIDER=sim
COPILOT_API_KEY=test_key
```

**Test Z.AI:**
```bash
COPILOT_PROVIDER=z-ai
COPILOT_API_KEY=test_key
```

**Test OpenAI Compatible:**
```bash
COPILOT_PROVIDER=openai-compatible
COPILOT_API_KEY=test_key
COPILOT_BASE_URL=https://api.example.com/v1
```

After each configuration change, restart and verify the UI updates correctly.

---

## Contributing

When adding new providers:

1. **Update API Route** (`apps/sim/app/api/copilot/providers/route.ts`):
   - Add provider to `availableProviders` array
   - Include required environment variables check
   - List supported models

2. **Update Provider Factory** (`apps/sim/lib/copilot/providers/index.ts`):
   - Add provider case in `getProviderConfig()`
   - Add validation logic

3. **Update Documentation** (this file):
   - Add provider configuration section
   - Update supported providers list

---

## Related Files

- **Backend Provider Factory:** `apps/sim/lib/copilot/providers/index.ts`
- **Provider Types:** `apps/sim/lib/copilot/types.ts`
- **Environment Config:** `apps/sim/lib/core/config/env.ts`
- **API Route:** `apps/sim/app/api/copilot/providers/route.ts`
- **UI Component:** `apps/sim/components/copilot/provider-selector.tsx`
- **Header Integration:** `apps/sim/app/chat/components/header/header.tsx`

---

## License

This feature is part of the Sim project and follows the same Apache 2.0 license.
