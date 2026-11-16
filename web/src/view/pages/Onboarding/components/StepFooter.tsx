import { Button } from '../../../components/Button'

interface StepFooterProps {
  showBack: boolean
  primaryLabel: string
  isLoading: boolean
  onBack(): void
  onPrimary(): void
}

export function StepFooter({ showBack, primaryLabel, isLoading, onBack, onPrimary }: StepFooterProps) {
  return (
    <footer className='w-full max-w-3xl mx-auto pt-6 border-t border-gray-200 flex items-center gap-4'>
      {showBack && (
        <Button ghost onClick={onBack} disabled={isLoading}>Voltar</Button>
      )}

      <Button className='ml-auto' onClick={onPrimary} isLoading={isLoading}>{primaryLabel}</Button>
    </footer>
  )
}
