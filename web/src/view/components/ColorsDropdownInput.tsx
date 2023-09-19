import { ChevronDownIcon, CrossCircledIcon } from '@radix-ui/react-icons'
import { cn } from '../../app/utils/cn'
import { DropdownMenu } from './DropdownMenu'
import {ColorIcon } from './ColorIcon'
import { useState } from 'react'
import { Color, colors } from '../constants/ColorsConstants'

interface ColorsDropdownInputProps {
  className?: string
  error?: string
  onChange?(value: string): void
  value?: string
}

export function ColorsDropdownInput({ className, error, onChange, value }: ColorsDropdownInputProps) {
  const [selectedColor, setSelectedcolor] = useState<null | Color>(() => {
    if (!value) return null

    const color = colors.find(c => c.color === value)
    return color ?? null
  })

  function handleSelect(color: Color) {
    setSelectedcolor(color)
    onChange?.(color.color)
  }

  return (
    <div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button
            className={cn(
              'bg-white w-full relative text-left rounded-lg border border-gray-500 px-3 h-[52px] text-gray-700 focus:border-gray-800 transition-all outline-none',
              error && '!border-red-900',
              className
            )}
          >
            Cor

            <div className='absolute right-3 top-1/2 -translate-y-1/2'>
              {!selectedColor && (
                <ChevronDownIcon className='w-6 h-6 text-gray-800' />
              )}

              {selectedColor && (
                <ColorIcon color={selectedColor.color} bg={selectedColor.bg} />
              )}
            </div>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
          className='grid grid-cols-4'
        >
          {colors.map(color => (
            <DropdownMenu.Item key={color.color} onSelect={() => handleSelect(color)}>
              <ColorIcon color={color.color} bg={color.bg}  />
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {error && (
        <div className='flex gap-2 items-center mt-2 text-red-900'>
          <CrossCircledIcon />
          <span className='text-xs'>{error}</span>
        </div>
      )}
    </div>
  )
}