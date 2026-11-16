import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'

interface ExitOnboardingModalProps {
  open: boolean
  isLoading: boolean
  onConfirm(): void
  onClose(): void
}

export function ExitOnboardingModal({ open, isLoading, onConfirm, onClose }: ExitOnboardingModalProps) {
  return (
    <Modal open={open} title='Sair da configuração' onClose={onClose}>
      <p className='text-center tracking-[-0.5px] text-gray-800'>
        O que faltar pode ser cadastrado depois, nas páginas do app. A configuração não abre de novo.
      </p>

      <div className='space-y-4'>
        <Button onClick={onConfirm} isLoading={isLoading} className='w-full'>Sair da configuração</Button>
        <Button onClick={onClose} disabled={isLoading} className='w-full' ghost>Continuar configurando</Button>
      </div>
    </Modal>
  )
}
