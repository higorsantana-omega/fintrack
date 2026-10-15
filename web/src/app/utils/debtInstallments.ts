import { DebtInstallment } from '../entities/Debt'

export function isOpenInstallment({ state }: Pick<DebtInstallment, 'state'>) {
  return state === 'OPEN' || state === 'OVERDUE'
}

export function getInstallmentYear({ month }: Pick<DebtInstallment, 'month'>) {
  return month.slice(0, 4)
}
