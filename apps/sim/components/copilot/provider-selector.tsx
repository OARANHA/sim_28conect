'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronDown, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Provider {
  id: string
  name: string
  description: string
  requiresApiKey: boolean
  requiresBaseUrl: boolean
  isConfigured: boolean
  models: string[]
}

interface ProviderInfo {
  current: {
    provider: string
    model: string
    configured: boolean
  }
  available: Provider[]
}

export function ProviderSelector() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('')

  useEffect(() => {
    fetchProviderInfo()
  }, [])

  const fetchProviderInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/copilot/providers')
      const data = await response.json()
      setProviderInfo(data)
      setSelectedProvider(data.current.provider)
    } catch (error) {
      console.error('Failed to fetch provider info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProviderSelect = async (providerId: string) => {
    // Note: Changing provider requires environment variable update
    // This is a display-only selector for now
    // In production, you would need to implement a backend endpoint to update env vars
    setSelectedProvider(providerId)
    setOpen(false)
    
    // Show notification that provider change requires restart
    alert(
      'Provider change detected!\n\n' +
      `To switch to ${providerId}, please update your .env file:\n` +
      `COPILOT_PROVIDER=${providerId}\n\n` +
      'Then restart your application.'
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading providers...</span>
      </div>
    )
  }

  if (!providerInfo) {
    return null
  }

  const currentProvider = providerInfo.available.find(
    (p) => p.id === selectedProvider
  )

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[280px] justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="truncate">
                {currentProvider?.name || 'Select provider...'}
              </span>
              {currentProvider?.isConfigured ? (
                <Badge variant="default" className="text-xs">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Not Configured
                </Badge>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0">
          <Command>
            <CommandInput placeholder="Search providers..." />
            <CommandList>
              <CommandEmpty>No provider found.</CommandEmpty>
              <CommandGroup heading="Available Providers">
                {providerInfo.available.map((provider) => (
                  <CommandItem
                    key={provider.id}
                    value={provider.id}
                    onSelect={() => handleProviderSelect(provider.id)}
                  >
                    <div className="flex flex-1 items-start gap-2">
                      <Check
                        className={cn(
                          'mt-0.5 h-4 w-4',
                          selectedProvider === provider.id
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}</span>
                          {provider.isConfigured ? (
                            <Badge variant="default" className="text-xs">
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Setup Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {provider.description}
                        </p>
                        {!provider.isConfigured && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Missing: {provider.requiresApiKey && 'API Key'}
                            {provider.requiresApiKey &&
                              provider.requiresBaseUrl &&
                              ', '}
                            {provider.requiresBaseUrl && 'Base URL'}
                          </p>
                        )}
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[200px]">
                            <div className="space-y-1">
                              <p className="font-semibold">Available Models:</p>
                              <ul className="list-disc list-inside text-xs">
                                {provider.models.map((model) => (
                                  <li key={model}>{model}</li>
                                ))}
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px]">
            <div className="space-y-2">
              <p className="font-semibold">Current Configuration:</p>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="font-medium">Provider:</span>{' '}
                  {providerInfo.current.provider}
                </p>
                <p>
                  <span className="font-medium">Model:</span>{' '}
                  {providerInfo.current.model}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  {providerInfo.current.configured ? (
                    <span className="text-green-600 dark:text-green-400">
                      Configured ✓
                    </span>
                  ) : (
                    <span className="text-orange-600 dark:text-orange-400">
                      Not Configured
                    </span>
                  )}
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
