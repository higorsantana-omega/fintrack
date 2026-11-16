import { useEffect, useRef } from 'react'
import { useBankAccounts } from '../../../../app/hooks/useBankAccounts'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { DashboardProvider } from '../../Dashboard/components/DashboardContext'
import { useDashboard } from '../../Dashboard/components/DashboardContext/useDashboard'
import { EditAccountModal } from '../../Dashboard/modals/EditAccountModal'
import { NewAccountModal } from '../../Dashboard/modals/NewAccountModal'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems } from '../components/StepItems'

function Accounts() {
  const { setHasItems, correctionId, goTo } = useOnboarding()
  const { accounts, isFetching } = useBankAccounts()
  const { toggleCloseNewAccountModal, toggleOpenEditAccountModal, accountBeingEdited } = useDashboard()
  const hasOpenedCorrection = useRef(false)

  useEffect(() => {
    setHasItems(accounts.length > 0)
  }, [accounts.length, setHasItems])

  // "Corrigir" on the review step opens that account once; the modal toggles, so never twice.
  useEffect(() => {
    const account = accounts.find(({ id }) => id === correctionId)
    if (!account || hasOpenedCorrection.current) return

    hasOpenedCorrection.current = true
    toggleOpenEditAccountModal(account)
  }, [accounts, correctionId, toggleOpenEditAccountModal])

  return (
    <>
      <StepItems
        addLabel='Adicionar conta'
        emptyMessage='Nenhuma conta cadastrada.'
        isLoading={isFetching}
        onAdd={toggleCloseNewAccountModal}
      >
        {accounts.map(account => (
          <StepItem
            key={account.id}
            name={account.name}
            detail='Saldo atual'
            value={formatCurrency(account.currentBalance)}
            color={account.color}
            onClick={() => toggleOpenEditAccountModal(account)}
          />
        ))}
      </StepItems>

      <NewAccountModal />
      {accountBeingEdited && (
        <EditAccountModal onSaved={() => accountBeingEdited.id === correctionId && goTo('REVIEW')} />
      )}
    </>
  )
}

export function AccountsStep() {
  return (
    <DashboardProvider>
      <Accounts />
    </DashboardProvider>
  )
}
