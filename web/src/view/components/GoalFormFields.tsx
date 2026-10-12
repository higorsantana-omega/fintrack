import { Control, Controller, FieldErrors, UseFormRegister, UseFormSetValue, useWatch } from 'react-hook-form'
import { BankAccount } from '../../app/entities/BankAccount'
import { GoalFormData } from '../../app/utils/goalForm'
import { getGoalPlanning, getMonthKey, localDateToCalendarDate, toGoalsCalendarDate } from '../../app/utils/goalPlanning'
import { currencyStringToNumber } from '../../app/utils/currencyStringToNumber'
import { formatCurrency } from '../../app/utils/formatCurrency'
import { Input } from './Input'
import { InputCurrency } from './InputCurrency'
import { Select } from './Select'
import { DatePickerInput } from './DatePickerInput'

interface GoalFormFieldsProps {
  control: Control<GoalFormData>
  register: UseFormRegister<GoalFormData>
  setValue: UseFormSetValue<GoalFormData>
  errors: FieldErrors<GoalFormData>
  accounts: BankAccount[]
  /** Sum of the contributions already made, without the initial amount. */
  contributionsTotal: number
  createdAt: Date
  resolvedMonths: string[]
}

function usePlanning({ control, contributionsTotal, createdAt, resolvedMonths }: GoalFormFieldsProps) {
  const [targetAmount, monthlyContribution, initialSaved, contributionDay, startDate, endDate] = useWatch({
    control,
    name: ['targetAmount', 'monthlyContribution', 'initialSaved', 'contributionDay', 'startDate', 'endDate']
  })

  const target = currencyStringToNumber(targetAmount ?? 0)
  const monthly = currencyStringToNumber(monthlyContribution ?? 0)
  const initial = currencyStringToNumber(initialSaved ?? 0)
  const day = Number(contributionDay)

  if (!(target > 0) || !(initial >= 0) || !(monthly >= 0)) return null
  if (!Number.isInteger(day) || day < 1 || day > 31) return null
  if (!startDate || !endDate) return null

  const start = localDateToCalendarDate(startDate)
  const end = localDateToCalendarDate(endDate)
  if (end < start) return null

  return getGoalPlanning({
    targetAmount: target,
    totalSaved: contributionsTotal + initial,
    monthlyContribution: monthly,
    contributionDay: day,
    startDate: start,
    endDate: end,
    creationMonth: getMonthKey(toGoalsCalendarDate(createdAt)),
    resolvedMonths
  })
}

export function GoalFormFields(props: GoalFormFieldsProps) {
  const { control, register, setValue, errors, accounts } = props
  const planning = usePlanning(props)

  return (
    <div className='flex flex-col gap-4'>
      <Input
        type='text'
        placeholder='Nome da meta'
        error={errors.name?.message}
        {...register('name')}
      />

      <div className='grid grid-cols-2 gap-4'>
        <div>
          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor alvo</span>
          <div className='flex items-center gap-1'>
            <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
            <Controller
              name='targetAmount'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='targetAmount' error={errors.targetAmount?.message} onChange={onChange} value={value} />
              )}
            />
          </div>
        </div>

        <div>
          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Já guardado</span>
          <div className='flex items-center gap-1'>
            <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
            <Controller
              name='initialSaved'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='initialSaved' error={errors.initialSaved?.message} onChange={onChange} value={value} />
              )}
            />
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <Controller
          control={control}
          name='startDate'
          render={({ field: { value, onChange } }) => (
            <DatePickerInput id='startDate' label='Início' error={errors.startDate?.message} value={value} onChange={onChange} />
          )}
        />
        <Controller
          control={control}
          name='endDate'
          render={({ field: { value, onChange } }) => (
            <DatePickerInput id='endDate' label='Fim' error={errors.endDate?.message} value={value} onChange={onChange} />
          )}
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <Input
          type='number'
          min={1}
          max={31}
          placeholder='Dia do aporte'
          error={errors.contributionDay?.message}
          {...register('contributionDay')}
        />

        <Controller
          control={control}
          name='bankAccountId'
          render={({ field: { onChange, value } }) => (
            <Select
              id='bankAccountId'
              placeholder='Conta de origem'
              onChange={onChange}
              value={value}
              error={errors.bankAccountId?.message}
              options={accounts.map(account => ({
                value: account.id,
                label: account.name
              }))}
            />
          )}
        />
      </div>

      <div className='rounded-2xl bg-gray-50 border border-gray-200 p-4 space-y-3'>
        <div>
          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Aporte mensal</span>
          <div className='flex items-center gap-1'>
            <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
            <Controller
              name='monthlyContribution'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='monthlyContribution' error={errors.monthlyContribution?.message} onChange={onChange} value={value} />
              )}
            />
          </div>
        </div>

        {planning?.suggestion != null && (
          <div className='flex items-center justify-between gap-2 text-sm text-gray-700 tracking-[-0.5px]'>
            <span>
              Aporte sugerido: <strong id='goal-suggestion'>{formatCurrency(planning.suggestion)}</strong>
            </span>
            {planning.suggestion > 0 && (
              <button
                type='button'
                className='text-teal-900 font-medium hover:underline'
                onClick={() => setValue('monthlyContribution', planning.suggestion!, { shouldValidate: true })}
              >
                Usar sugestão
              </button>
            )}
          </div>
        )}

        {planning && (
          <p id='goal-projection' className='text-sm text-gray-700 tracking-[-0.5px]'>
            Na data final você terá <strong>{formatCurrency(planning.projection)}</strong>
            {planning.missing > 0
              ? <>, faltando <strong>{formatCurrency(planning.missing)}</strong> para o alvo.</>
              : <> e atinge o alvo.</>}
          </p>
        )}
      </div>
    </div>
  )
}
