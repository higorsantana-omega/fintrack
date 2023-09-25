import { useState } from 'react'
import { useBankAccounts } from '../../../../../../app/hooks/useBankAccounts'

export function useFiltersModal() {
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<null | string>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const { accounts } = useBankAccounts()

  function handleSelectBankAccount(bankAccountId: string) {
    setSelectedBankAccountId(prevState => prevState === bankAccountId ? null : prevState)
  }

  function handleChangeYear(step: number) {
    setSelectedYear(prevState => prevState + step)
  }

  return {
    handleSelectBankAccount,
    selectedBankAccountId,

    handleChangeYear,
    selectedYear,

    accounts
  }
}