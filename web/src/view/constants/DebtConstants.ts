import { DebtStatus, InstallmentState } from '../../app/entities/Debt'

export const INSTALLMENT_STATE_LABELS: Record<InstallmentState, string> = {
  PAID_BEFORE_APP: 'Paga antes do app',
  PAID: 'Paga',
  OPEN: 'Em aberto',
  OVERDUE: 'Atrasada'
}

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  IN_PROGRESS: 'Em andamento',
  OVERDUE: 'Atrasada',
  PAID: 'Quitada'
}
