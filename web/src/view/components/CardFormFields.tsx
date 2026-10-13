import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form'
import { CardFormData } from '../../app/utils/cardForm'
import { Input } from './Input'
import { InputCurrency } from './InputCurrency'
import { ColorsDropdownInput } from './ColorsDropdownInput'

interface CardFormFieldsProps {
  control: Control<CardFormData>
  register: UseFormRegister<CardFormData>
  errors: FieldErrors<CardFormData>
}

export function CardFormFields({ control, register, errors }: CardFormFieldsProps) {
  return (
    <div className='flex flex-col gap-4'>
      <div>
        <span className='text-gray-600 tracking-[-0.5px] text-xs'>Limite</span>
        <div className='flex items-center gap-1'>
          <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
          <Controller
            name='limit'
            control={control}
            render={({ field: { onChange, value } }) => (
              <InputCurrency id='cardLimit' error={errors.limit?.message} onChange={onChange} value={value} />
            )}
          />
        </div>
      </div>

      <Input
        type='text'
        placeholder='Nome do cartão'
        error={errors.name?.message}
        {...register('name')}
      />

      <div className='grid grid-cols-2 gap-4'>
        <Input
          type='number'
          min={1}
          max={31}
          placeholder='Dia do fechamento'
          error={errors.closingDay?.message}
          {...register('closingDay')}
        />
        <Input
          type='number'
          min={1}
          max={31}
          placeholder='Dia do vencimento'
          error={errors.dueDay?.message}
          {...register('dueDay')}
        />
      </div>

      <Controller
        control={control}
        name='color'
        render={({ field: { onChange, value } }) => (
          <ColorsDropdownInput error={errors.color?.message} onChange={onChange} value={value} />
        )}
      />
    </div>
  )
}
