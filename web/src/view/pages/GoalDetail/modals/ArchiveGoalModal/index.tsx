import { GoalDetail } from '../../../../../app/entities/Goal'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { useArchiveGoalModalController } from './useArchiveGoalModalController'

interface ArchiveGoalModalProps {
  goal: GoalDetail
  open: boolean
  onClose(): void
}

export function ArchiveGoalModal({ goal, open, onClose }: ArchiveGoalModalProps) {
  const {
    hasContributions,
    isReturning,
    isKeeping,
    isArchiving,
    handleReturnMoney,
    handleKeepMoney
  } = useArchiveGoalModalController(goal, onClose)

  return (
    <Modal title='Arquivar meta' open={open} onClose={onClose}>
      <p className='text-gray-800 tracking-[-0.5px] text-center'>
        A meta arquivada fica só para leitura e não pode ser desarquivada.
        {hasContributions && ' O que deve acontecer com o dinheiro guardado nela?'}
      </p>

      <div className='space-y-4'>
        {hasContributions && (
          <>
            <Button
              id='archive-return'
              className='w-full'
              isLoading={isReturning}
              disabled={isArchiving}
              onClick={handleReturnMoney}
            >
              Devolver o dinheiro às contas
            </Button>
            <Button
              id='archive-keep'
              className='w-full'
              ghost
              isLoading={isKeeping}
              disabled={isArchiving}
              onClick={handleKeepMoney}
            >
              Manter como despesa
            </Button>
          </>
        )}

        {!hasContributions && (
          <Button
            id='archive-confirm'
            className='w-full'
            isLoading={isKeeping}
            disabled={isArchiving}
            onClick={handleKeepMoney}
          >
            Arquivar
          </Button>
        )}
      </div>
    </Modal>
  )
}
