import { Controller } from 'react-hook-form'
import { RecurringCharge } from '../../../../../app/entities/CreditCard'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Select } from '../../../../components/Select'
import { useEditRecurringChargeModalController } from './useEditRecurringChargeModalController'

interface EditRecurringChargeModalProps {
  cardId: string
  recurringCharge: RecurringCharge
  onClose(): void
}

export function EditRecurringChargeModal({ cardId, recurringCharge, onClose }: EditRecurringChargeModalProps) {
  const {
    register,
    errors,
    control,
    handleSubmit,
    isLoading,
    categories
  } = useEditRecurringChargeModalController(cardId, recurringCharge, onClose)

  return (
    <Modal title='Editar recorrente' open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            <Controller
              name='value'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='recurringValue' error={errors.value?.message} onChange={onChange} value={value} />
              )}
            />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor</span>
        </div>

        <div className='mt-10 flex flex-col gap-4'>
          <Input
            id='recurringDescription'
            type='text'
            placeholder='Descrição'
            error={errors.description?.message}
            {...register('description')}
          />

          <Controller
            control={control}
            name='categoryId'
            render={({ field: { onChange, value } }) => (
              <Select
                id='recurringCategoryId'
                placeholder='Categoria'
                onChange={onChange}
                value={value}
                error={errors.categoryId?.message}
                options={categories.map(category => ({ value: category.id, label: category.name }))}
              />
            )}
          />

          <p className='text-sm text-gray-700 tracking-[-0.5px]'>
            Vale para as próximas cobranças. As já lançadas continuam como estão.
          </p>
        </div>

        <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}
