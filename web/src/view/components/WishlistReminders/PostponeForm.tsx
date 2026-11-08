import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MONTH_PATTERN, integerBetween } from '../../../app/utils/debtForm'
import { Button } from '../Button'
import { Input } from '../Input'

const schema = z.object({
  // The native month input gives 'YYYY-MM', or '' when empty.
  plannedMonth: z.string().regex(MONTH_PATTERN, 'Informe um mês válido'),
  plannedDay: z.union([z.literal(''), integerBetween(1, 31, 'Informe um dia entre 1 e 31')])
})

type FormData = z.infer<typeof schema>

export interface PostponeFormData {
  plannedMonth: string
  plannedDay?: number
}

interface PostponeFormProps {
  /** The month the form starts with, as 'YYYY-MM'. */
  suggestion: string
  isLoading: boolean
  onSubmit(data: PostponeFormData): void
  onBack(): void
}

export function PostponeForm({ suggestion, isLoading, onSubmit, onBack }: PostponeFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plannedMonth: suggestion, plannedDay: '' }
  })

  const submit = handleSubmit(({ plannedMonth, plannedDay }) => onSubmit({
    plannedMonth,
    ...(plannedDay !== '' && { plannedDay })
  }))

  return (
    <form id='wishlist-reminder-postpone-form' onSubmit={submit} noValidate>
      <div className='grid grid-cols-[minmax(0,1fr)_7rem] gap-4'>
        <Input
          id='wishlist-reminder-month'
          type='month'
          placeholder='Novo mês'
          error={errors.plannedMonth?.message}
          {...register('plannedMonth')}
        />
        <Input
          id='wishlist-reminder-day'
          type='number'
          min={1}
          max={31}
          placeholder='Dia'
          error={errors.plannedDay?.message}
          {...register('plannedDay')}
        />
      </div>

      <div className='mt-10 space-y-4'>
        <Button id='wishlist-reminder-postpone-confirm' type='submit' className='w-full' isLoading={isLoading}>
          Confirmar
        </Button>
        <Button
          id='wishlist-reminder-postpone-back'
          type='button'
          className='w-full'
          ghost
          disabled={isLoading}
          onClick={onBack}
        >
          Voltar
        </Button>
      </div>
    </form>
  )
}
