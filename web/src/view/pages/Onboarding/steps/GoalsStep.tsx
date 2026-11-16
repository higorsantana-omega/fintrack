import { useEffect, useState } from 'react'
import { useBankAccounts } from '../../../../app/hooks/useBankAccounts'
import { useGoal } from '../../../../app/hooks/useGoal'
import { useGoals } from '../../../../app/hooks/useGoals'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { EditGoalModal } from '../../GoalDetail/modals/EditGoalModal'
import { GoalsProvider } from '../../Goals/components/GoalsContext'
import { useGoalsPage } from '../../Goals/components/GoalsContext/useGoalsPage'
import { NewGoalModal } from '../../Goals/modals/NewGoalModal'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems } from '../components/StepItems'

// EditGoalModal takes the goal's detail, so it opens once the detail page's query loads it.
function EditGoal({ goalId, onClose }: { goalId: string, onClose(): void }) {
  const { goal } = useGoal(goalId)

  return goal ? <EditGoalModal goal={goal} open onClose={onClose} /> : null
}

function Goals() {
  const { setHasItems, goTo, goNext, isMoving } = useOnboarding()
  const { accounts, isFetching: isLoadingAccounts } = useBankAccounts()
  const { goals, isInitialLoading } = useGoals()
  const { toggleCloseNewGoalModal } = useGoalsPage()
  const [goalIdBeingEdited, setGoalIdBeingEdited] = useState<string | null>(null)

  useEffect(() => {
    setHasItems(goals.length > 0)
  }, [goals.length, setHasItems])

  if (accounts.length === 0 && isLoadingAccounts) {
    return (
      <div className='py-8 flex justify-center'>
        <Spinner className='w-8 h-8' />
      </div>
    )
  }

  // Every goal draws its contributions from an account (R19).
  if (accounts.length === 0) {
    return (
      <div className='p-6 rounded-2xl border border-gray-200 flex flex-col gap-4'>
        <p className='text-gray-800 tracking-[-0.5px]'>
          Metas precisam de uma conta de origem, de onde saem os aportes. Cadastre uma conta antes de criar metas.
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button className='h-10 px-4' onClick={() => goTo('ACCOUNTS')} disabled={isMoving}>Voltar a Contas</Button>
          <Button className='h-10 px-4' ghost onClick={goNext} disabled={isMoving}>Pular</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <StepItems
        addLabel='Adicionar meta'
        emptyMessage='Nenhuma meta cadastrada.'
        isLoading={isInitialLoading}
        onAdd={toggleCloseNewGoalModal}
      >
        {goals.map(goal => (
          <StepItem
            key={goal.id}
            name={goal.name}
            detail={goal.bankAccount ? `Alvo · aportes de ${goal.bankAccount.name}` : 'Alvo'}
            value={formatCurrency(goal.targetAmount)}
            color={goal.bankAccount?.color}
            onClick={() => setGoalIdBeingEdited(goal.id)}
          />
        ))}
      </StepItems>

      <NewGoalModal />
      {goalIdBeingEdited && <EditGoal goalId={goalIdBeingEdited} onClose={() => setGoalIdBeingEdited(null)} />}
    </>
  )
}

export function GoalsStep() {
  return (
    <GoalsProvider>
      <Goals />
    </GoalsProvider>
  )
}
