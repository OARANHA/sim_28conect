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
  // { value: 'claude-4-sonnet', label: 'Claude 4 Sonnet' },
  // { value: 'claude-4.1-opus', label: 'Claude 4.1 Opus' },
  
  // OpenAI GPT models
  { value: 'gpt-5.1-codex', label: 'GPT 5.1 Codex' },
  { value: 'gpt-5.1-medium', label: 'GPT 5.1 Medium' },
  // { value: 'gpt-5-codex', label: 'GPT 5 Codex' },
  // { value: 'gpt-5-fast', label: 'GPT 5 Fast' },
  // { value: 'gpt-5', label: 'GPT 5' },
  // { value: 'gpt-5.1-fast', label: 'GPT 5.1 Fast' },
  // { value: 'gpt-5.1', label: 'GPT 5.1' },
  // { value: 'gpt-5.1-high', label: 'GPT 5.1 High' },
  // { value: 'gpt-5-high', label: 'GPT 5 High' },
  // { value: 'gpt-4o', label: 'GPT 4o' },
  // { value: 'gpt-4.1', label: 'GPT 4.1' },
  // { value: 'o3', label: 'o3' },
  
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
  { value: 'z-ai/default', label: 'Z.AI Default' },
  { value: 'z-ai/fast', label: 'Z.AI Fast' },
  { value: 'z-ai/creative', label: 'Z.AI Creative' },
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
 * Threshold for considering input "near top" of viewport (in pixels)
 */
export const NEAR_TOP_THRESHOLD = 300

/**
 * Scroll tolerance for mention menu positioning (in pixels)
 */
export const SCROLL_TOLERANCE = 8
