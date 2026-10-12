import { z } from 'zod'
import { GoalParams } from '../services/goalsService'
import { currencyStringToNumber } from './currencyStringToNumber'
import { toGoalsCalendarDate } from './goalPlanning'

const currency = (requiredMessage: string) => z.union([
  z.string().nonempty(requiredMessage),
  z.number()
])

export const positiveCurrency = (requiredMessage: string, positiveMessage: string) =>
  currency(requiredMessage).refine(value => currencyStringToNumber(value) > 0, positiveMessage)

export const goalFormSchema = z.object({
  name: z.string().nonempty('Informe o nome da meta'),
  targetAmount: positiveCurrency('Informe o valor alvo', 'O valor alvo deve ser maior que zero'),
  monthlyContribution: positiveCurrency('Informe o aporte mensal', 'O aporte mensal deve ser maior que zero'),
  initialSaved: currency('Informe o valor já guardado'),
  contributionDay: z.coerce.number()
    .int('Informe um dia entre 1 e 31')
    .min(1, 'Informe um dia entre 1 e 31')
    .max(31, 'Informe um dia entre 1 e 31'),
  startDate: z.date(),
  endDate: z.date(),
  bankAccountId: z.string().nonempty('Informe a conta de origem')
}).refine(
  data => toGoalsCalendarDate(data.endDate) >= toGoalsCalendarDate(data.startDate),
  { message: 'A data final não pode ser anterior à data de início', path: ['endDate'] }
)

export type GoalFormData = z.infer<typeof goalFormSchema>

export function toGoalParams(data: GoalFormData): GoalParams {
  return {
    name: data.name,
    targetAmount: currencyStringToNumber(data.targetAmount),
    monthlyContribution: currencyStringToNumber(data.monthlyContribution),
    initialSaved: currencyStringToNumber(data.initialSaved),
    contributionDay: data.contributionDay,
    startDate: data.startDate.toISOString(),
    endDate: data.endDate.toISOString(),
    bankAccountId: data.bankAccountId
  }
}

/** A calendar date from the API (UTC midnight) as a local date for the date pickers. */
export function calendarDateToLocal(isoDate: string) {
  const date = new Date(isoDate)

  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}
