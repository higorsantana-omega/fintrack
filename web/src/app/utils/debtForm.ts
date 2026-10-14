import { z } from 'zod'
import { DebtParams } from '../services/debtsService'
import { BorrowerParams } from '../services/borrowersService'
import { currencyStringToNumber } from './currencyStringToNumber'
import { positiveCurrency } from './goalForm'
import { getMonthKey, toGoalsCalendarDate } from './goalPlanning'

// Mirror MAX_INSTALLMENTS and the date window of the API.
export const MAX_DEBT_INSTALLMENTS = 480
const MAX_MONTH_DISTANCE = 120

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const integerBetween = (min: number, max: number, message: string) => z.coerce.number()
  .int(message)
  .min(min, message)
  .max(max, message)

/** The current month in São Paulo, as the 'YYYY-MM' of the month input. */
export function getCurrentMonth() {
  const today = toGoalsCalendarDate(new Date())

  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`
}

function isMonthInWindow(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const monthKey = year * 12 + monthNumber - 1

  return Math.abs(monthKey - getMonthKey(toGoalsCalendarDate(new Date()))) <= MAX_MONTH_DISTANCE
}

export const debtFormSchema = z.object({
  name: z.string().nonempty('Informe o nome da dívida'),
  installmentValue: positiveCurrency('Informe o valor da parcela', 'O valor da parcela deve ser maior que zero'),
  installmentsCount: integerBetween(1, MAX_DEBT_INSTALLMENTS, `Informe de 1 a ${MAX_DEBT_INSTALLMENTS} parcelas`),
  dueDay: integerBetween(1, 31, 'Informe um dia entre 1 e 31'),
  nextInstallment: z.coerce.number()
    .int('Informe a próxima parcela')
    .min(1, 'Informe a próxima parcela'),
  nextInstallmentMonth: z.string()
    .regex(MONTH_PATTERN, 'Informe o mês da próxima parcela')
    .refine(isMonthInWindow, 'O mês deve estar a até 10 anos de hoje'),
  hasEntry: z.boolean(),
  entryBankAccountId: z.string(),
  entryValue: z.union([z.string(), z.number()])
}).superRefine((data, ctx) => {
  if (data.nextInstallment > data.installmentsCount) {
    ctx.addIssue({
      code: 'custom',
      path: ['nextInstallment'],
      message: 'A próxima parcela não pode passar do total de parcelas'
    })
  }

  if (!data.hasEntry) return

  if (!data.entryBankAccountId) {
    ctx.addIssue({ code: 'custom', path: ['entryBankAccountId'], message: 'Informe a conta' })
  }

  if (!(currencyStringToNumber(data.entryValue) > 0)) {
    ctx.addIssue({ code: 'custom', path: ['entryValue'], message: 'Informe um valor maior que zero' })
  }
})

export type DebtFormData = z.infer<typeof debtFormSchema>

export function toDebtParams(data: DebtFormData): DebtParams {
  return {
    name: data.name,
    installmentValue: currencyStringToNumber(data.installmentValue),
    installmentsCount: data.installmentsCount,
    dueDay: data.dueDay,
    nextInstallment: data.nextInstallment,
    nextInstallmentMonth: data.nextInstallmentMonth,
    ...(data.hasEntry && {
      entryBankAccountId: data.entryBankAccountId,
      entryValue: currencyStringToNumber(data.entryValue)
    })
  }
}

export const borrowerFormSchema = z.object({
  name: z.string().nonempty('Informe o nome da pessoa'),
  openingBalance: z.union([z.string(), z.number()])
})

export type BorrowerFormData = z.infer<typeof borrowerFormSchema>

export function toBorrowerParams(data: BorrowerFormData): BorrowerParams {
  return {
    name: data.name,
    openingBalance: currencyStringToNumber(data.openingBalance)
  }
}
