/**
 * Constants for user input component
 */

import { PROVIDER_DEFINITIONS } from '@/providers/models'

/**
 * Mention menu options in order (matches visual render order)
 */
export const MENTION_OPTIONS = [
  'Chats',
  'Workflows',
  'Knowledge',
  'Blocks',
  'Workflow Blocks',
  'Templates',
  'Logs',
  'Docs',
] as const

/**
 * Model configuration options
 */
export const MODEL_OPTIONS = [
  { value: 'claude-4.5-opus', label: 'Claude 4.5 Opus' },
  { value: 'claude-4.5-sonnet', label: 'Claude 4.5 Sonnet' },
  // { value: 'claude-4-sonnet', label: 'Claude 4 Sonnet' },
  { value: 'claude-4.5-haiku', label: 'Claude 4.5 Haiku' },
  // { value: 'claude-4.1-opus', label: 'Claude 4.1 Opus' },
  { value: 'gpt-5.1-codex', label: 'GPT 5.1 Codex' },
  // { value: 'gpt-5-codex', label: 'GPT 5 Codex' },
  { value: 'gpt-5.1-medium', label: 'GPT 5.1 Medium' },
  // { value: 'gpt-5-fast', label: 'GPT 5 Fast' },
  // { value: 'gpt-5', label: 'GPT 5' },
  // { value: 'gpt-5.1-fast', label: 'GPT 5.1 Fast' },
  // { value: 'gpt-5.1', label: 'GPT 5.1' },
  // { value: 'gpt-5.1-high', label: 'GPT 5.1 High' },
  // { value: 'gpt-5-high', label: 'GPT 5 High' },
  // { value: 'gpt-4o', label: 'GPT 4o' },
  // { value: 'gpt-4.1', label: 'GPT 4.1' },
  // { value: 'o3', label: 'o3' },
  { value: 'gemini-3-pro', label: 'Gemini 3 Pro' },
] as const

/**
 * Provider configuration options
 */
export const PROVIDER_OPTIONS = [
  { value: 'default', label: 'Default (from .env)', icon: '⚙️' },
  { value: 'anthropic', label: 'Anthropic (Claude)', icon: '🤖' },
  { value: 'openai', label: 'OpenAI (GPT)', icon: '🧠' },
  { value: 'mistral', label: 'Mistral AI', icon: '⚡' },
  { value: 'z-ai', label: 'Z.AI', icon: '🚀' },
  { value: 'azure-openai', label: 'Azure OpenAI', icon: '☁️' },
  { value: 'vertex', label: 'Vertex AI', icon: '🌐' },
  { value: 'google', label: 'Google (Gemini)', icon: '🔷' },
  { value: 'xai', label: 'xAI (Grok)', icon: '✖️' },
  { value: 'deepseek', label: 'Deepseek', icon: '🔍' },
  { value: 'bedrock', label: 'AWS Bedrock', icon: '🪨' },
  { value: 'cerebras', label: 'Cerebras', icon: '🧠' },
  { value: 'groq', label: 'Groq', icon: '⚡' },
] as const

/**
 * Get models for a specific provider from the provider definitions
 */
export function getModelsForProvider(provider: string): Array<{ value: string; label: string }> {
  // Handle default provider (returns static MODEL_OPTIONS)
  if (provider === 'default') {
    return MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label }))
  }

  // Map provider IDs to their corresponding keys in PROVIDER_DEFINITIONS
  const providerMap: Record<string, string> = {
    anthropic: 'anthropic',
    openai: 'openai',
    mistral: 'mistral',
    'azure-openai': 'azure-openai',
    vertex: 'vertex',
    google: 'google',
    xai: 'xai',
    deepseek: 'deepseek',
    bedrock: 'bedrock',
    cerebras: 'cerebras',
    groq: 'groq',
    ollama: 'ollama',
    vllm: 'vllm',
    openrouter: 'openrouter',
  }

  const providerId = providerMap[provider]
  if (!providerId || !PROVIDER_DEFINITIONS[providerId]) {
    return []
  }

  const providerDef = PROVIDER_DEFINITIONS[providerId]

  // Generate label from model ID
  const formatModelLabel = (modelId: string): string => {
    // Remove provider prefix if present (e.g., 'azure/' from 'azure/gpt-4o')
    const cleanId = modelId.replace(/^[a-z-]+\//, '')

    // Convert to title case and clean up
    return cleanId
      .split('-')
      .map((part) => {
        // Keep version numbers lowercase, capitalize others
        if (/^\d+(\.\d+)?$/.test(part)) return part
        if (part === 'v' || part.startsWith('v') || part.endsWith('v')) return part
        return part.charAt(0).toUpperCase() + part.slice(1)
      })
      .join(' ')
  }

  return providerDef.models.map((model) => ({
    value: model.id,
    label: formatModelLabel(model.id),
  }))
}

/**
 * Threshold for considering input "near top" of viewport (in pixels)
 */
export const NEAR_TOP_THRESHOLD = 300

/**
 * Scroll tolerance for mention menu positioning (in pixels)
 */
export const SCROLL_TOLERANCE = 8
