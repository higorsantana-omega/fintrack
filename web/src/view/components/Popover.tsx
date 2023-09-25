import * as RdxPopover from '@radix-ui/react-popover'
import { cn } from '../../app/utils/cn'

interface PopoverContentProps {
  children: React.ReactNode
  className?: string
}

function PopoverRoot({ children }: { children: React.ReactNode }) {
  return (
    <RdxPopover.Root>
      {children}
    </RdxPopover.Root>
  )
}

function PopoverTrigger({ children }: { children: React.ReactNode }) {
  return (
    <RdxPopover.Trigger asChild>
      {children}
    </RdxPopover.Trigger>
  )
}

function PopoverContent({ children, className }: PopoverContentProps) {
  return (
    <RdxPopover.Portal>
      <RdxPopover.Content
        className={cn(
          'rounded-2xl bg-white p-4 space-y-2 shadow-[0px_11px_20px_0px_rgba(0,0,0,0.10)] z-[99]',
          'data-[side=bottom]:animate-slideUpAndFade',
          'data-[side=top]:animate-slideDownAndFade',
          className
        )}
      >
        {children}
      </RdxPopover.Content>
    </RdxPopover.Portal>
  )
}

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent
}