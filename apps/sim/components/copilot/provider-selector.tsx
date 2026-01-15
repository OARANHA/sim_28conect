'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Sparkles } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/core/utils/cn'

interface Provider {
  id: string
  name: string
  description: string
  icon?: string
}

const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'ChatGPT models (GPT-4, GPT-3.5)'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models (Opus, Sonnet, Haiku)'
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini models'
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Mistral AI models'
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Fast inference models'
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Open-source models'
  }
]

export function ProviderSelector() {
  const [activeProvider, setActiveProvider] = useState<string>('openai')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch active provider from API
  useEffect(() => {
    async function fetchActiveProvider() {
      try {
        const response = await fetch('/api/copilot/providers')
        if (response.ok) {
          const data = await response.json()
          if (data.activeProvider) {
            setActiveProvider(data.activeProvider)
          }
        }
      } catch (error) {
        console.error('Failed to fetch active provider:', error)
      }
    }
    fetchActiveProvider()
  }, [])

  const handleProviderChange = async (providerId: string) => {
    setIsLoading(true)
    setActiveProvider(providerId)
    // Here you would call API to save the selection
    // For now just updating local state
    setTimeout(() => setIsLoading(false), 500)
  }

  const activeProviderData = PROVIDERS.find((p) => p.id === activeProvider)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Select
              value={activeProvider}
              onValueChange={handleProviderChange}
              disabled={isLoading}
            >
              <SelectTrigger
                className={cn(
                  'w-[200px] h-9 text-sm border-border/50',
                  'hover:border-border transition-colors',
                  'focus:ring-1 focus:ring-primary/20'
                )}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <SelectValue placeholder="Select provider" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PROVIDERS.map((provider) => (
                    <SelectItem
                      key={provider.id}
                      value={provider.id}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">
                            {provider.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {provider.description}
                          </span>
                        </div>
                        {provider.id === activeProvider && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-xs"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          <div className="text-xs">
            <p className="font-medium mb-1">Current Provider</p>
            <p className="text-muted-foreground">
              {activeProviderData?.description}
            </p>
            <p className="mt-2 text-muted-foreground">
              Switch providers to use different AI models
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
