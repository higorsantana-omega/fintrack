import { z } from 'zod'
import { CardParams } from '../services/cardsService'
import { currencyStringToNumber } from './currencyStringToNumber'
import { positiveCurrency } from './goalForm'

const day = (message: string) => z.coerce.number()
  .int(message)
  .min(1, message)
  .max(31, message)

export const cardFormSchema = z.object({
  name: z.string().nonempty('Informe o nome do cartão'),
  color: z.string().nonempty('Informe a cor'),
  limit: positiveCurrency('Informe o limite', 'O limite deve ser maior que zero'),
  closingDay: day('Informe um dia entre 1 e 31'),
  dueDay: day('Informe um dia entre 1 e 31')
})

export type CardFormData = z.infer<typeof cardFormSchema>

export function toCardParams(data: CardFormData): CardParams {
  return {
    name: data.name,
    color: data.color,
    limit: currencyStringToNumber(data.limit),
    closingDay: data.closingDay,
    dueDay: data.dueDay
  }
}
