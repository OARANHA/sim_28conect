'use client'

import { useProviderSelectionStore } from '@/stores/providers'

const PROVIDERS = [
  {
    id: null,
    name: '⚙️ Default (from .env)',
    description: 'Use environment configuration',
  },
  {
    id: 'anthropic',
    name: '🤖 Anthropic (Claude)',
    description: 'Claude models',
  },
  {
    id: 'openai',
    name: '🧠 OpenAI (GPT)',
    description: 'GPT models',
  },
  {
    id: 'mistral',
    name: '⚡ Mistral AI',
    description: 'Mistral models',
  },
  {
    id: 'z-ai',
    name: '🚀 Z.AI',
    description: 'Z.AI platform',
  },
  {
    id: 'azure-openai',
    name: '☁️ Azure OpenAI',
    description: 'Microsoft Azure',
  },
  {
    id: 'vertex',
    name: '🌐 Vertex AI',
    description: 'Google Cloud',
  },
] as const

export function ProviderSelector() {
  const { selectedProvider, setSelectedProvider } = useProviderSelectionStore()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedProvider(value === 'default' ? null : value)
  }

  return (
    <div className='flex items-center gap-2'>
      <select
        value={selectedProvider || 'default'}
        onChange={handleChange}
        className='rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring'
        aria-label='Select AI provider'
      >
        {PROVIDERS.map((provider) => (
          <option key={provider.id || 'default'} value={provider.id || 'default'}>
            {provider.name}
          </option>
        ))}
      </select>
    </div>
  )
}
