'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Badge,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverItem,
  PopoverScrollArea,
} from '@/components/emcn'
import { useProviderSelectionStore } from '@/stores/providers'
import { PROVIDER_OPTIONS } from '../../constants'

interface ProviderSelectorProps {
  /** Whether the input is near the top of viewport (affects dropdown direction) */
  isNearTop: boolean
}

/**
 * Provider selector dropdown for choosing AI provider.
 * Allows switching between Anthropic, OpenAI, Mistral, etc.
 *
 * @param props - Component props
 * @returns Rendered provider selector dropdown
 */
export function ProviderSelector({ isNearTop }: ProviderSelectorProps) {
  const { selectedProvider, setSelectedProvider } = useProviderSelectionStore()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const currentProvider = PROVIDER_OPTIONS.find(
    (p) => p.value === (selectedProvider || 'default')
  ) || PROVIDER_OPTIONS[0]

  const handleSelect = (providerValue: string) => {
    setSelectedProvider(providerValue === 'default' ? null : providerValue)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      // Keep popover open while resizing the panel (mousedown on resize handle)
      const target = event.target as Element | null
      if (
        target &&
        (target.closest('[aria-label="Resize panel"]') ||
          target.closest('[role="separator"]') ||
          target.closest('.cursor-ew-resize'))
      ) {
        return
      }

      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <Popover open={open} variant='default'>
      <PopoverAnchor asChild>
        <div ref={triggerRef} className='min-w-0 max-w-full'>
          <Badge
            variant='outline'
            className='min-w-0 max-w-full cursor-pointer rounded-[6px]'
            title='Choose provider'
            aria-expanded={open}
            onMouseDown={(e) => {
              e.stopPropagation()
              setOpen((prev) => !prev)
            }}
          >
            <span className='text-base'>{currentProvider.icon}</span>
            <span className='min-w-0 flex-1 truncate'>{currentProvider.label}</span>
          </Badge>
        </div>
      </PopoverAnchor>
      <PopoverContent
        ref={popoverRef}
        side={isNearTop ? 'bottom' : 'top'}
        align='start'
        sideOffset={4}
        maxHeight={280}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <PopoverScrollArea className='space-y-[2px]'>
          {PROVIDER_OPTIONS.map((option) => (
            <PopoverItem
              key={option.value}
              active={(selectedProvider || 'default') === option.value}
              onClick={() => handleSelect(option.value)}
            >
              <span className='text-base'>{option.icon}</span>
              <span>{option.label}</span>
            </PopoverItem>
          ))}
        </PopoverScrollArea>
      </PopoverContent>
    </Popover>
  )
}
