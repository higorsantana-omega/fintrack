import { useEffect, useState } from 'react'
import { useBankAccounts } from '../../../../app/hooks/useBankAccounts'
import { useGoal } from '../../../../app/hooks/useGoal'
import { useGoals } from '../../../../app/hooks/useGoals'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { EditGoalModal } from '../../GoalDetail/modals/EditGoalModal'
import { GoalsProvider } from '../../Goals/components/GoalsContext'
import { useGoalsPage } from '../../Goals/components/GoalsContext/useGoalsPage'
import { NewGoalModal } from '../../Goals/modals/NewGoalModal'
import { MissingPrerequisite } from '../components/MissingPrerequisite'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems, StepLoader } from '../components/StepItems'

function EditGoal({ goalId, onClose }: { goalId: string, onClose(): void }) {
  const { goal } = useGoal(goalId)

  return goal ? <EditGoalModal goal={goal} open onClose={onClose} /> : null
}

function Goals() {
  const { setHasItems } = useOnboarding()
  const { accounts, isFetching: isLoadingAccounts } = useBankAccounts()
  const { goals, isInitialLoading } = useGoals()
  const { toggleCloseNewGoalModal } = useGoalsPage()
  const [goalIdBeingEdited, setGoalIdBeingEdited] = useState<string | null>(null)

  useEffect(() => {
    setHasItems(goals.length > 0)
  }, [goals.length, setHasItems])

  if (accounts.length === 0 && isLoadingAccounts) return <StepLoader />

  if (accounts.length === 0) {
    return (
      <MissingPrerequisite
        message='Metas precisam de uma conta de origem, de onde saem os aportes. Cadastre uma conta antes de criar metas.'
        backLabel='Voltar a Contas'
        backStep='ACCOUNTS'
      />
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
