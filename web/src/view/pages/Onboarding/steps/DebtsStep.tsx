import { useEffect, useState } from 'react'
import { useBorrower } from '../../../../app/hooks/useBorrower'
import { useBorrowers } from '../../../../app/hooks/useBorrowers'
import { useDebt } from '../../../../app/hooks/useDebt'
import { useDebts } from '../../../../app/hooks/useDebts'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { EditBorrowerModal } from '../../BorrowerDetail/modals/EditBorrowerModal'
import { EditDebtModal } from '../../DebtDetail/modals/EditDebtModal'
import { NewBorrowerModal } from '../../Debts/modals/NewBorrowerModal'
import { NewDebtModal } from '../../Debts/modals/NewDebtModal'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems } from '../components/StepItems'

type DebtsModal =
  | { kind: 'newDebt' }
  | { kind: 'editDebt', id: string }
  | { kind: 'newBorrower' }
  | { kind: 'editBorrower', id: string }

function EditDebt({ debtId, onClose }: { debtId: string, onClose(): void }) {
  const { debt } = useDebt(debtId)

  return debt ? <EditDebtModal debt={debt} onClose={onClose} /> : null
}

function EditBorrower({ borrowerId, onClose }: { borrowerId: string, onClose(): void }) {
  const { borrower } = useBorrower(borrowerId)

  return borrower ? <EditBorrowerModal borrower={borrower} onClose={onClose} /> : null
}

export function DebtsStep() {
  const { setHasItems } = useOnboarding()
  const { debts, isInitialLoading: isLoadingDebts } = useDebts()
  const { borrowers, isInitialLoading: isLoadingBorrowers } = useBorrowers()
  const [modal, setModal] = useState<DebtsModal | null>(null)

  const hasItems = debts.length + borrowers.length > 0
  const closeModal = () => setModal(null)

  useEffect(() => {
    setHasItems(hasItems)
  }, [hasItems, setHasItems])

  return (
    <div className='flex flex-col gap-8'>
      <StepItems
        title='Eu devo'
        addLabel='Adicionar dívida'
        emptyMessage='Nenhuma dívida cadastrada.'
        isLoading={isLoadingDebts}
        onAdd={() => setModal({ kind: 'newDebt' })}
      >
        {debts.map(debt => (
          <StepItem
            key={debt.id}
            name={debt.name}
            detail={`Falta · ${debt.paidCount} de ${debt.installmentsCount} parcelas pagas`}
            value={formatCurrency(debt.remaining)}
            onClick={() => setModal({ kind: 'editDebt', id: debt.id })}
          />
        ))}
      </StepItems>

      <StepItems
        title='Me devem'
        addLabel='Adicionar pessoa'
        emptyMessage='Ninguém cadastrado.'
        isLoading={isLoadingBorrowers}
        onAdd={() => setModal({ kind: 'newBorrower' })}
      >
        {borrowers.map(borrower => (
          <StepItem
            key={borrower.id}
            name={borrower.name}
            detail={borrower.balance > 0 ? 'Deve' : 'Em dia'}
            value={borrower.balance > 0 ? formatCurrency(borrower.balance) : undefined}
            onClick={() => setModal({ kind: 'editBorrower', id: borrower.id })}
          />
        ))}
      </StepItems>

      {modal?.kind === 'newDebt' && <NewDebtModal open hideEntry onClose={closeModal} />}
      {modal?.kind === 'editDebt' && <EditDebt debtId={modal.id} onClose={closeModal} />}
      {modal?.kind === 'newBorrower' && <NewBorrowerModal open onClose={closeModal} />}
      {modal?.kind === 'editBorrower' && <EditBorrower borrowerId={modal.id} onClose={closeModal} />}
    </div>
  )
}
