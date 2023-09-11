import * as RdxDropdowMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '../../app/utils/cn'

interface DropdownMenuItemsProps {
  children: React.ReactNode
  className?: string
  onSelect?(): void
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
}

function DropdownMenuRoot({ children }: { children: React.ReactNode }) {
  return (
    <RdxDropdowMenu.Root>
      {children}
    </RdxDropdowMenu.Root>
  )
}

function DropdownMenuTrigger({ children }: { children: React.ReactNode }) {
  return (
    <RdxDropdowMenu.Trigger className='outline-none'>
      {children}
    </RdxDropdowMenu.Trigger>
  )
}


function DropdownMenuContent({ children, className }: DropdownMenuContentProps) {
  return (
    <RdxDropdowMenu.Portal>
      <RdxDropdowMenu.Content
        className={cn(
          'rounded-2xl bg-white p-2 space-y-2 shadow-[0px_11px_20px_0px_rgba(0,0,0,0.10)] z-50',
          'data-[side=bottom]:animate-slideUpAndFade',
          'data-[side=top]:animate-slideDownAndFade',
          className
        )}
      >
        {children}
      </RdxDropdowMenu.Content>
    </RdxDropdowMenu.Portal>
  )
}

function DropdownMenuItem({ children, className, onSelect }: DropdownMenuItemsProps) {
  return (
    <RdxDropdowMenu.Item
      onSelect={onSelect}
      className={cn(
        'min-h-[40px] outline-none flex items-center py-2 px-4 text-sm text-gray-800 data-[highlighted]:bg-gray-50 rounded-2xl transition-colors cursor-pointer',
        className
      )}
    >
      {children}
    </RdxDropdowMenu.Item>
  )
}

export const DropdownMenu = {
  Root: DropdownMenuRoot,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  Trigger: DropdownMenuTrigger
}