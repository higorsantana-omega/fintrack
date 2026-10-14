import { InstallmentState } from '../../app/entities/Debt'

export const INSTALLMENT_STATE_LABELS: Record<InstallmentState, string> = {
  PAID_BEFORE_APP: 'Paga antes do app',
  PAID: 'Paga',
  OPEN: 'Em aberto',
  OVERDUE: 'Atrasada'
}
