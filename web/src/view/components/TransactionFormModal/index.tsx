import { Input } from '../Input'
import { InputCurrency } from '../InputCurrency'
import { Modal } from '../Modal'
import { Select } from '../Select'
import { DatePickerInput } from '../DatePickerInput'
import { Button } from '../Button'
import { Controller } from 'react-hook-form'
import {
  SavedTransaction,
  TransactionInitialValues,
  TransactionType,
  useTransactionFormModalController
} from './useTransactionFormModalController'

interface TransactionFormModalProps {
  open: boolean
  type: TransactionType
  initialValues?: TransactionInitialValues
  /** Fires right after the transaction is saved, before the modal closes. */
  onSaved?(transaction: SavedTransaction): void
  onClose(): void
}

// Mount it once per opening (give it a key): the initial values only count
// on the first render.
export function TransactionFormModal({ open, type, initialValues, onSaved, onClose }: TransactionFormModalProps) {
  const {
    control,
    errors,
    handleSubmit,
    register,
    accounts,
    categories,
    isLoading
  } = useTransactionFormModalController({ type, initialValues, onSaved, onClose })

  const isExpense = type === 'EXPENSE'

  return (
    <Modal title={isExpense ? 'Nova Despesa' : 'Nova Receita'} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            <Controller
              name='value'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='transactionValue' error={errors.value?.message} onChange={onChange} value={value} />
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
            render={({ field: { onChange, value } }) => (
              <Select
                id='transactionCategoryId'
                placeholder='Categoria'
                onChange={onChange}
                value={value}
                error={errors.categoryId?.message}
                options={categories}
              />
            )}
          />

          <Controller
            control={control}
            name='bankAccountId'
            render={({ field: { onChange, value } }) => (
              <Select
                id='transactionBankAccountId'
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
            render={({ field: { value, onChange }}) => (
              <DatePickerInput id='transactionDate' error={errors.date?.message} value={value} onChange={onChange} />
            )}
          />
        </div>

        <Button id='transactionSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Criar
        </Button>
      </form>
    </Modal>
  )
}
