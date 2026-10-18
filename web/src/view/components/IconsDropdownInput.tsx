import { ChevronDownIcon, CrossCircledIcon } from '@radix-ui/react-icons'
import { cn } from '../../app/utils/cn'
import { colors } from '../constants/ColorsConstants'
import { DropdownMenu } from './DropdownMenu'
import { iconKeys, iconsMap } from './icons/categories/iconsMap'

interface IconsDropdownInputProps {
  className?: string
  error?: string
  onChange?(value: string): void
  value?: string
  /** Hex of the group, so the choices show the icon the way it will look. */
  color?: string
}

export function IconsDropdownInput({ className, error, onChange, value, color }: IconsDropdownInputProps) {
  const palette = colors.find(item => item.color === color) ?? colors[0]
  const SelectedIcon = value ? iconsMap[value] : undefined

  return (
    <div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button
            id='categoryIcon'
            type='button'
            className={cn(
              'bg-white w-full relative text-left rounded-lg border border-gray-500 px-3 h-[52px] text-gray-700 focus:border-gray-800 transition-all outline-none',
              error && '!border-red-900',
              className
            )}
          >
            Ícone

            <div className='absolute right-3 top-1/2 -translate-y-1/2'>
              {!SelectedIcon && <ChevronDownIcon className='w-6 h-6 text-gray-800' />}

              {SelectedIcon && (
                <span
                  className='w-8 h-8 rounded-lg flex items-center justify-center'
                  style={{ background: palette.bg, color: palette.color }}
                >
                  <SelectedIcon className='w-5 h-5' />
                </span>
              )}
            </div>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content className='grid grid-cols-6 gap-1 max-h-64 overflow-y-auto'>
          {iconKeys.map(key => {
            const Icon = iconsMap[key]

            return (
              <DropdownMenu.Item key={key} className='justify-center px-2' onSelect={() => onChange?.(key)}>
                <span
                  aria-label={key}
                  className='w-8 h-8 rounded-lg flex items-center justify-center'
                  style={{ background: palette.bg, color: palette.color }}
                >
                  <Icon className='w-5 h-5' />
                </span>
              </DropdownMenu.Item>
            )
          })}
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
