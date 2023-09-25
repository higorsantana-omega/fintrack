import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { useNewTransactionModalController } from './useTransactionModalController'
import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'

export function NewTransactionModal() {
  const {
    isNewTransactionModalOpen,
    toggleOpenTransactionModal,
    newTransactionType,
    control,
    errors,
    handleSubmit,
    register,
    accounts,
    categories,
    isLoading,
  } = useNewTransactionModalController()

  const isExpense = newTransactionType === 'EXPENSE'

  return (
    <Modal title={isExpense ? 'Nova Despesa' : 'Nova Receita'} open={isNewTransactionModalOpen} onClose={() => toggleOpenTransactionModal(newTransactionType)}>
      <form onSubmit={handleSubmit}>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            <Controller
              name='value'
              control={control}
              defaultValue='0,00'
              render={({ field: { onChange, value } }) => (
                <InputCurrency error={errors.value?.message} onChange={onChange} value={value} />
              )}
            />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor {isExpense ? 'da despesa' : 'da receita'}</span>
        </div>

        <div className='mt-10 flex flex-col gap-4'>
          <Input 
            type='text'
            placeholder={isExpense ? 'Nome da Despesa' : 'Nome da Receita'}
            error={errors.name?.message}
            {...register('name')}
          />

          <Controller
            control={control}
            name='categoryId'
            defaultValue=''
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder='Categoria'
                onChange={onChange}
                value={value}
                error={errors.categoryId?.message}
                options={categories.map(category => ({
                  value: category.id,
                  label: category.name
                }))}
              />
            )}
          />

          <Controller
            control={control}
            name='bankAccountId'
            defaultValue=''
            render={({ field: { onChange, value } }) => (
              <Select
                placeholder={isExpense ? 'Pagar com' : 'Receber na conta'}
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

          <Controller
            control={control}
            name='date'
            defaultValue={new Date()}
            render={({ field: { value, onChange }}) => (
              <DatePickerInput error={errors.date?.message} value={value} onChange={onChange} />
            )}
          />
        </div>

        <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
          Criar
        </Button>
      </form>
    </Modal>
  )
}