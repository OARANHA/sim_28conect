import { NextResponse } from 'next/server'
import { getProviderInfo } from '@/lib/copilot/providers'
import { env } from '@/lib/core/config/env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/copilot/providers
 * Returns list of available Copilot providers and current active provider
 */
export async function GET() {
  try {
    const currentProvider = getProviderInfo()
    
    // List of all supported providers with their requirements
    const availableProviders = [
      {
        id: 'sim',
        name: 'Sim.ai',
        description: 'Managed Copilot service by Sim.ai',
        requiresApiKey: true,
        requiresBaseUrl: false,
        isConfigured: !!env.COPILOT_API_KEY,
        models: [
          'claude-3-7-sonnet-latest',
          'claude-3-5-sonnet-latest',
          'gpt-4o',
          'gpt-4o-mini',
        ],
      },
      {
        id: 'openai-compatible',
        name: 'OpenAI Compatible',
        description: 'Any OpenAI-compatible API endpoint',
        requiresApiKey: true,
        requiresBaseUrl: true,
        isConfigured: !!(env.COPILOT_API_KEY && env.COPILOT_BASE_URL),
        models: ['claude-3-7-sonnet-latest', 'gpt-4o', 'custom-model'],
      },
      {
        id: 'z-ai',
        name: 'Z.AI',
        description: 'Z.AI inference platform',
        requiresApiKey: true,
        requiresBaseUrl: false,
        isConfigured: !!env.COPILOT_API_KEY,
        models: [
          'claude-3-7-sonnet-latest',
          'claude-3-5-sonnet-latest',
          'gpt-4o',
        ],
      },
      {
        id: 'mistral',
        name: 'Mistral AI',
        description: 'Direct Mistral AI API',
        requiresApiKey: true,
        requiresBaseUrl: false,
        isConfigured: !!(env.MISTRAL_API_KEY || env.COPILOT_API_KEY),
        models: [
          'mistral-large-latest',
          'mistral-medium-latest',
          'mistral-small-latest',
        ],
      },
      {
        id: 'azure-openai',
        name: 'Azure OpenAI',
        description: 'Microsoft Azure OpenAI Service',
        requiresApiKey: true,
        requiresBaseUrl: false,
        isConfigured: !!(env.AZURE_OPENAI_API_KEY && env.AZURE_OPENAI_ENDPOINT),
        models: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
      },
      {
        id: 'vertex',
        name: 'Google Vertex AI',
        description: 'Google Cloud Vertex AI',
        requiresApiKey: false,
        requiresBaseUrl: false,
        isConfigured: !!(env.VERTEX_PROJECT && env.VERTEX_LOCATION),
        models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'claude-3-7-sonnet'],
      },
    ]

    return NextResponse.json({
      current: {
        provider: currentProvider.provider,
        model: currentProvider.model,
        configured: currentProvider.configured,
      },
      available: availableProviders,
    })
  } catch (error) {
    console.error('Error fetching provider info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch provider information' },
      { status: 500 }
    )
  }
}
