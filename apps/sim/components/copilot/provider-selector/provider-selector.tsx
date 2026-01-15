'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useProviderSelectionStore } from '@/stores/providers'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models',
    icon: '🤖',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models',
    icon: '🧠',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral models',
    icon: '⚡',
  },
  {
    id: 'z-ai',
    name: 'Z.AI',
    description: 'Z.AI platform',
    icon: '🚀',
  },
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    description: 'Microsoft Azure',
    icon: '☁️',
  },
  {
    id: 'vertex',
    name: 'Vertex AI',
    description: 'Google Cloud',
    icon: '🌐',
  },
] as const

export function ProviderSelector() {
  const { selectedProvider, setSelectedProvider } = useProviderSelectionStore()
  const [open, setOpen] = useState(false)

  const currentProvider = PROVIDERS.find((p) => p.id === selectedProvider) || {
    id: 'default',
    name: 'Default',
    description: 'From .env',
    icon: '⚙️',
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className='flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'>
        <span className='text-base'>{currentProvider.icon}</span>
        <span className='hidden sm:inline'>{currentProvider.name}</span>
        <ChevronDown className='h-4 w-4 opacity-50' />
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-56'>
        {/* Default option */}
        <DropdownMenuItem
          onClick={() => {
            setSelectedProvider(null)
            setOpen(false)
          }}
          className='flex items-center justify-between'
        >
          <div className='flex items-center gap-3'>
            <span className='text-base'>⚙️</span>
            <div>
              <div className='font-medium'>Default</div>
              <div className='text-xs text-muted-foreground'>From .env config</div>
            </div>
          </div>
          {selectedProvider === null && <Check className='h-4 w-4' />}
        </DropdownMenuItem>

        {/* Divider */}
        <div className='my-1 h-px bg-border' />

        {/* Provider options */}
        {PROVIDERS.map((provider) => (
          <DropdownMenuItem
            key={provider.id}
            onClick={() => {
              setSelectedProvider(provider.id)
              setOpen(false)
            }}
            className='flex items-center justify-between'
          >
            <div className='flex items-center gap-3'>
              <span className='text-base'>{provider.icon}</span>
              <div>
                <div className='font-medium'>{provider.name}</div>
                <div className='text-xs text-muted-foreground'>{provider.description}</div>
              </div>
            </div>
            {selectedProvider === provider.id && <Check className='h-4 w-4' />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
