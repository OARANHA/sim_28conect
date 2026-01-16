/**
 * Constants for user input component
 */

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
  // Anthropic Claude models
  { value: 'claude-4.5-opus', label: 'Claude 4.5 Opus' },
  { value: 'claude-4.5-sonnet', label: 'Claude 4.5 Sonnet' },
  { value: 'claude-4.5-haiku', label: 'Claude 4.5 Haiku' },

  // OpenAI GPT models
  { value: 'gpt-5.1-codex', label: 'GPT 5.1 Codex' },
  { value: 'gpt-5.1-medium', label: 'GPT 5.1 Medium' },
  { value: 'gpt-5.1-fast', label: 'GPT 5.1 Fast' },
  { value: 'gpt-5.1', label: 'GPT 5.1' },
  { value: 'gpt-5.1-high', label: 'GPT 5.1 High' },

  // Google Gemini models
  { value: 'gemini-3-pro', label: 'Gemini 3 Pro' },

  // Mistral AI models
  { value: 'mistral-large-latest', label: 'Mistral Large Latest' },
  { value: 'mistral-small-latest', label: 'Mistral Small Latest' },
  { value: 'codestral-latest', label: 'Codestral Latest' },
  { value: 'ministral-8b-latest', label: 'Ministral 8B Latest' },
  { value: 'ministral-3b-latest', label: 'Ministral 3B Latest' },
  { value: 'pixtral-large-latest', label: 'Pixtral Large Latest' },
  { value: 'pixtral-12b', label: 'Pixtral 12B' },

  // Z.AI models (custom models)
  { value: 'z-ai/fast', label: 'Z.AI Fast' },
  { value: 'z-ai/creative', label: 'Z.AI Creative' },

  // AWS Bedrock models (not supported yet)
  // { value: 'bedrock', label: 'AWS Bedrock' },
  // { value: 'cerebras', label: 'Cerebras' },
  // { value: 'groq', label: 'Groq' },
  // { value: 'together', label: 'Together AI' },
  // { value: 'deepseek', label: 'DeepSeek' },
  // { value: 'xai', label: 'xAI (Grok)' },
] as const

/**
 * Provider configuration options
 * These match providers supported by Copilot backend API (sim, openai-compatible, mistral, z-ai, azure-openai, vertex)
 * Plus additional workspace providers (anthropic, google, mistral, groq, together, xai, deepseek, bedrock, cerebras)
 */
export const PROVIDER_OPTIONS = [
  { value: 'default', label: 'Default (from .env)', icon: '⚙️' },
  { value: 'sim', label: 'Sim.ai (Managed)', icon: '🌟' },
  { value: 'openai-compatible', label: 'OpenAI Compatible', icon: '🧠' },
  { value: 'mistral', label: 'Mistral AI', icon: '⚡' },
  { value: 'z-ai', label: 'Z.AI', icon: '🚀' },
  { value: 'azure-openai', label: 'Azure OpenAI', icon: '☁️' },
  { value: 'vertex', label: 'Vertex AI', icon: '🌐' },
  // Existing workspace providers
  { value: 'anthropic', label: 'Anthropic (Claude)', icon: '🤖' },
  { value: 'google', label: 'Google (Gemini)', icon: '🔷' },
  // Existing workspace providers
  { value: 'mistral', label: 'Mistral AI', icon: '⚡' },
  // Existing workspace providers
  { value: 'groq', label: 'Groq', icon: '⚡' },
  // Existing workspace providers
  { value: 'together', label: 'Together AI', icon: '🤝' },
  // Existing workspace providers
  { value: 'xai', label: 'xAI (Grok)', icon: '✖️' },
  // Existing workspace providers
  { value: 'deepseek', label: 'DeepSeek', icon: '🔍' },
  // Existing workspace providers
  { value: 'bedrock', label: 'AWS Bedrock', icon: '🪨' },
  // Existing workspace providers
  { value: 'cerebras', label: 'Cerebras', icon: '🧠' },
  // Existing workspace providers
] as const

/**
 * Threshold for considering input "near top" of viewport (in pixels)
 */
export const NEAR_TOP_THRESHOLD = 300

/**
 * Scroll tolerance for mention menu positioning (in pixels)
 */
export const SCROLL_TOLERANCE = 8
