import { createLogger } from '@sim/logger'
import { env } from '@/lib/core/config/env'
import type { CopilotProviderConfig } from '@/lib/copilot/types'

const logger = createLogger('CopilotProviders')

/**
 * Get the provider configuration based on environment variables or runtime override
 * Supports multiple providers: sim, openai-compatible, mistral, azure-openai, vertex
 * @param providerOverride - Optional provider override from UI selection
 */
export function getProviderConfig(providerOverride?: string): CopilotProviderConfig | undefined {
  // Use override if provided, otherwise fall back to environment variable
  const provider = providerOverride || env.COPILOT_PROVIDER || 'sim'
  const model = env.COPILOT_MODEL || 'claude-3-7-sonnet-latest'

  logger.info(`Initializing Copilot with provider: ${provider}`, {
    provider,
    model,
    hasApiKey: !!env.COPILOT_API_KEY,
    hasBaseUrl: !!env.COPILOT_BASE_URL,
    isOverride: !!providerOverride,
  })

  // Default sim.ai provider (managed service)
  if (provider === 'sim') {
    if (!env.COPILOT_API_KEY) {
      logger.warn('COPILOT_API_KEY not set for sim provider. Some features may be limited.')
    }
    return {
      provider: 'sim',
      model,
      apiKey: env.COPILOT_API_KEY,
    }
  }

  // OpenAI-compatible providers (Z.AI, Mistral via OpenAI format, etc.)
  if (provider === 'openai-compatible') {
    if (!env.COPILOT_BASE_URL) {
      logger.error('COPILOT_BASE_URL is required for openai-compatible provider')
      throw new Error('COPILOT_BASE_URL is required for openai-compatible provider')
    }
    if (!env.COPILOT_API_KEY) {
      logger.error('COPILOT_API_KEY is required for openai-compatible provider')
      throw new Error('COPILOT_API_KEY is required for openai-compatible provider')
    }
    return {
      provider: 'openai-compatible',
      model,
      apiKey: env.COPILOT_API_KEY,
      baseUrl: env.COPILOT_BASE_URL,
    }
  }

  // Direct Mistral provider
  if (provider === 'mistral') {
    const apiKey = env.MISTRAL_API_KEY || env.COPILOT_API_KEY
    const baseUrl = env.MISTRAL_BASE_URL || env.COPILOT_BASE_URL
    if (!apiKey) {
      logger.error('MISTRAL_API_KEY or COPILOT_API_KEY is required for mistral provider')
      throw new Error('MISTRAL_API_KEY or COPILOT_API_KEY is required for mistral provider')
    }
    return {
      provider: 'mistral',
      model,
      apiKey,
      baseUrl,
    }
  }

  // Z.AI provider (alias for openai-compatible with default URL)
  if (provider === 'z-ai') {
    const baseUrl = env.COPILOT_BASE_URL || 'https://api.z.ai/v1'
    if (!env.COPILOT_API_KEY) {
      logger.error('COPILOT_API_KEY is required for z-ai provider')
      throw new Error('COPILOT_API_KEY is required for z-ai provider')
    }
    return {
      provider: 'openai-compatible',
      model,
      apiKey: env.COPILOT_API_KEY,
      baseUrl,
    }
  }

  // Azure OpenAI provider
  if (provider === 'azure-openai') {
    if (!env.AZURE_OPENAI_API_KEY || !env.AZURE_OPENAI_ENDPOINT) {
      logger.error('AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are required for azure-openai provider')
      throw new Error('AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are required for azure-openai provider')
    }
    return {
      provider: 'azure-openai',
      model,
      apiKey: env.AZURE_OPENAI_API_KEY,
      apiVersion: env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
      endpoint: env.AZURE_OPENAI_ENDPOINT,
    }
  }

  // Vertex AI provider
  if (provider === 'vertex') {
    if (!env.VERTEX_PROJECT || !env.VERTEX_LOCATION) {
      logger.error('VERTEX_PROJECT and VERTEX_LOCATION are required for vertex provider')
      throw new Error('VERTEX_PROJECT and VERTEX_LOCATION are required for vertex provider')
    }
    return {
      provider: 'vertex',
      model,
      apiKey: env.COPILOT_API_KEY,
      vertexProject: env.VERTEX_PROJECT,
      vertexLocation: env.VERTEX_LOCATION,
    }
  }

  // Fallback to default behavior for other providers
  if (env.COPILOT_API_KEY) {
    logger.info(`Using default configuration for provider: ${provider}`)
    return {
      provider: provider as any,
      model,
      apiKey: env.COPILOT_API_KEY,
    }
  }

  logger.warn('No provider configuration found. Copilot will attempt to use server defaults.')
  return undefined
}

/**
 * Validate the provider configuration
 * Returns true if configuration is valid, false otherwise
 */
export function validateProviderConfig(): { isValid: boolean; error?: string } {
  const provider = env.COPILOT_PROVIDER || 'sim'

  try {
    const config = getProviderConfig()
    
    if (!config && provider !== 'sim') {
      return {
        isValid: false,
        error: `Invalid provider configuration for ${provider}. Please check your environment variables.`,
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown configuration error',
    }
  }
}

/**
 * Get provider information for health check endpoint
 */
export function getProviderInfo() {
  const provider = env.COPILOT_PROVIDER || 'sim'
  const config = getProviderConfig()

  return {
    provider,
    model: env.COPILOT_MODEL,
    configured: !!config,
    config: config
      ? {
          hasApiKey: !!config.apiKey,
          hasBaseUrl: 'baseUrl' in config,
          hasEndpoint: 'endpoint' in config,
        }
      : null,
  }
}
