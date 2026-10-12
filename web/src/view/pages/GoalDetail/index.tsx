import { Link } from 'react-router-dom'
import { ArchiveIcon, ArrowLeftIcon, Pencil1Icon, PlusIcon } from '@radix-ui/react-icons'
import { cn } from '../../../app/utils/cn'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatDate } from '../../../app/utils/formatDate'
import { calendarDateToLocal } from '../../../app/utils/goalForm'
import { getGoalProgress } from '../../../app/utils/getGoalProgress'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'
import { GOAL_STATUS_LABELS } from '../../constants/GoalConstants'
import { GoalActionButton } from './components/GoalActionButton'
import { GoalEvolutionChart } from './components/GoalEvolutionChart'
import { GoalHistory } from './components/GoalHistory'
import { EditGoalModal } from './modals/EditGoalModal'
import { ManualContributionModal } from './modals/ManualContributionModal'
import { ArchiveGoalModal } from './modals/ArchiveGoalModal'
import { useGoalDetailController } from './useGoalDetailController'

export function GoalDetail() {
  const {
    goal,
    isLoading,
    planning,
    openModal,
    openEditModal,
    openContributionModal,
    openArchiveModal,
    openDeleteModal,
    closeModal,
    canEdit,
    canArchive,
    canContribute,
    canDelete,
    isLoadingDelete,
    handleDeleteGoal
  } = useGoalDetailController()

  if (isLoading || !goal) {
    return (
      <main className='flex-1 flex items-center justify-center'>
        <Spinner className='w-10 h-10' />
      </main>
    )
  }

  const progress = getGoalProgress(goal)
  const shortfall = Math.max(0, goal.targetAmount - goal.totalSaved)
  const showProjection = (goal.status === 'IN_PROGRESS' || goal.status === 'SCHEDULED') && planning

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <Link to='/metas' className='flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 w-fit'>
        <ArrowLeftIcon /> Metas
      </Link>

      <section className='bg-teal-900 rounded-2xl p-6 md:p-8 text-white flex flex-col gap-6'>
        <header className='flex flex-col md:flex-row md:items-start justify-between gap-4'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 id='goal-name' className='text-2xl tracking-[-1px] font-bold'>{goal.name}</h1>
              <span id='goal-status' className='text-xs font-medium rounded-full px-2 py-1 bg-white/[0.15]'>
                {GOAL_STATUS_LABELS[goal.status]}
              </span>
            </div>
            <p className='text-sm text-teal-50'>
              {formatDate(calendarDateToLocal(goal.startDate))} até {formatDate(calendarDateToLocal(goal.endDate))}
              {' · '}aporte de {formatCurrency(goal.monthlyContribution)} no dia {goal.contributionDay}
              {' · '}conta {goal.bankAccount ? goal.bankAccount.name : 'excluída'}
            </p>
          </div>

          <div className='flex flex-wrap gap-2 md:justify-end md:shrink-0'>
            {canContribute && (
              <GoalActionButton
                id='goal-action-contribute'
                label='Novo aporte'
                icon={PlusIcon}
                primary
                onClick={openContributionModal}
              />
            )}
            {canEdit && (
              <GoalActionButton id='goal-action-edit' label='Editar' icon={Pencil1Icon} onClick={openEditModal} />
            )}
            {canArchive && (
              <GoalActionButton id='goal-action-archive' label='Arquivar' icon={ArchiveIcon} onClick={openArchiveModal} />
            )}
            {canDelete && (
              <Button className='h-10 bg-white/[0.15] hover:bg-red-900' onClick={openDeleteModal}>Excluir</Button>
            )}
          </div>
        </header>

        <div className='space-y-2'>
          <div className='flex items-baseline justify-between gap-2'>
            <strong id='goal-total' className='text-2xl tracking-[-1px]'>{formatCurrency(goal.totalSaved)}</strong>
            <span className='text-sm text-teal-50'>de {formatCurrency(goal.targetAmount)} · {progress}%</span>
          </div>
          <div className='h-2 rounded-full bg-white/20 overflow-hidden' role='progressbar' aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className='h-full rounded-full bg-white' style={{ width: `${progress}%` }} />
          </div>
        </div>

        {goal.status === 'COMPLETED' && (
          <p id='goal-result' className={cn('text-sm font-medium', goal.targetReached ? 'text-white' : 'text-teal-50')}>
            {goal.targetReached
              ? 'Meta atingida!'
              : `Terminou abaixo do alvo: faltaram ${formatCurrency(shortfall)}.`}
          </p>
        )}

        {showProjection && (
          <p id='goal-detail-projection' className='text-sm text-teal-50'>
            Mantendo o aporte atual, na data final você terá <strong className='text-white'>{formatCurrency(planning.projection)}</strong>
            {planning.missing > 0
              ? <>, faltando <strong className='text-white'>{formatCurrency(planning.missing)}</strong> para o alvo.</>
              : <> e atinge o alvo.</>}
          </p>
        )}
      </section>

      <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4'>
        <GoalEvolutionChart data={goal.evolution} />
        <GoalHistory items={goal.history} />
      </div>

      {openModal === 'edit' && <EditGoalModal goal={goal} open onClose={closeModal} />}
      {openModal === 'contribution' && <ManualContributionModal goal={goal} open onClose={closeModal} />}
      {openModal === 'archive' && <ArchiveGoalModal goal={goal} open onClose={closeModal} />}
      {openModal === 'delete' && (
        <ConfirmDeleteModal
          isLoading={isLoadingDelete}
          onConfirm={handleDeleteGoal}
          onClose={closeModal}
          title='Tem certeza que deseja excluir esta meta?'
        />
      )}
    </main>
  )
}
