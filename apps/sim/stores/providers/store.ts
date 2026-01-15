import { createLogger } from '@sim/logger'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OpenRouterModelInfo, ProvidersStore } from './types'

const logger = createLogger('ProvidersStore')

export const useProvidersStore = create<ProvidersStore>((set, get) => ({
  providers: {
    base: { models: [], isLoading: false },
    ollama: { models: [], isLoading: false },
    vllm: { models: [], isLoading: false },
    openrouter: { models: [], isLoading: false },
  },
  openRouterModelInfo: {},

  setProviderModels: (provider, models) => {
    logger.info(`Updated ${provider} models`, { count: models.length })
    set((state) => ({
      providers: {
        ...state.providers,
        [provider]: {
          ...state.providers[provider],
          models,
        },
      },
    }))
  },

  setProviderLoading: (provider, isLoading) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [provider]: {
          ...state.providers[provider],
          isLoading,
        },
      },
    }))
  },

  setOpenRouterModelInfo: (modelInfo: Record<string, OpenRouterModelInfo>) => {
    const structuredOutputCount = Object.values(modelInfo).filter(
      (m) => m.supportsStructuredOutputs
    ).length
    logger.info('Updated OpenRouter model info', {
      count: Object.keys(modelInfo).length,
      withStructuredOutputs: structuredOutputCount,
    })
    set({ openRouterModelInfo: modelInfo })
  },

  getProvider: (provider) => {
    return get().providers[provider]
  },

  getOpenRouterModelInfo: (modelId: string) => {
    return get().openRouterModelInfo[modelId]
  },
}))

/**
 * Store for user's runtime provider selection in chat UI
 * null = use environment variable default
 * 'openai' | 'anthropic' = override with specific provider
 */
export const useProviderSelectionStore = create<{
  selectedProvider: 'openai' | 'anthropic' | null
  setSelectedProvider: (provider: 'openai' | 'anthropic' | null) => void
}>()(persist(
  (set) => ({
    selectedProvider: null,
    setSelectedProvider: (provider) => {
      logger.info('Provider selection changed', { provider })
      set({ selectedProvider: provider })
    },
  }),
  {
    name: 'provider-selection-store',
  }
))
