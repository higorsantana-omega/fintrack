import { useEffect } from 'react'
import { useBankAccounts } from '../../../../app/hooks/useBankAccounts'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { DashboardProvider } from '../../Dashboard/components/DashboardContext'
import { useDashboard } from '../../Dashboard/components/DashboardContext/useDashboard'
import { EditAccountModal } from '../../Dashboard/modals/EditAccountModal'
import { NewAccountModal } from '../../Dashboard/modals/NewAccountModal'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems } from '../components/StepItems'

function Accounts() {
  const { setHasItems } = useOnboarding()
  const { accounts, isFetching } = useBankAccounts()
  const { toggleCloseNewAccountModal, toggleOpenEditAccountModal, accountBeingEdited } = useDashboard()

  useEffect(() => {
    setHasItems(accounts.length > 0)
  }, [accounts.length, setHasItems])

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
      {accountBeingEdited && <EditAccountModal />}
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
