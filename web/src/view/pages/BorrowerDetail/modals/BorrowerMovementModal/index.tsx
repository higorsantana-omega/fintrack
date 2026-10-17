import { Link } from 'react-router-dom'
import { Controller } from 'react-hook-form'
import { BorrowerMovementKind } from '../../../../../app/entities/Borrower'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Select } from '../../../../components/Select'
import { InputCurrency } from '../../../../components/InputCurrency'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { useBorrowerMovementModalController } from './useBorrowerMovementModalController'

interface BorrowerMovementModalProps {
  borrowerId: string
  borrowerName: string
  kind: BorrowerMovementKind
  onClose(): void
}

const COPY: Record<BorrowerMovementKind, { title: string, valueLabel: string, accountLabel: string, note: string, submit: string }> = {
  LEND: {
    title: 'Emprestei',
    valueLabel: 'Valor emprestado',
    accountLabel: 'Saiu da conta',
    note: 'Sai da conta como uma despesa na categoria Empréstimos.',
    submit: 'Registrar empréstimo'
  },
  RETURN: {
    title: 'Devolveu',
    valueLabel: 'Valor devolvido',
    accountLabel: 'Entrou na conta',
    note: 'Entra na conta como uma receita na categoria Empréstimos.',
    submit: 'Registrar devolução'
  }
}

export function BorrowerMovementModal({ borrowerId, borrowerName, kind, onClose }: BorrowerMovementModalProps) {
  const { accounts, control, errors, handleSubmit, isLoading } = useBorrowerMovementModalController(borrowerId, kind, onClose)
  const copy = COPY[kind]

  return (
    <Modal title={copy.title} open onClose={onClose}>
      {accounts.length === 0 && (
        <div className='flex flex-col items-center text-center gap-6'>
          <p className='text-gray-800 tracking-[-0.5px]'>
            Para registrar uma movimentação, cadastre antes uma conta no Dashboard.
          </p>
          <Link
            to='/'
            onClick={onClose}
            className='bg-teal-900 hover:bg-teal-800 px-6 h-12 rounded-2xl font-medium text-white flex items-center justify-center w-full'
          >
            Ir para o Dashboard
          </Link>
        </div>
      )}

      {accounts.length > 0 && (
        <form onSubmit={handleSubmit}>
          <strong className='text-gray-800 tracking-[-0.5px] text-lg block mb-6'>{borrowerName}</strong>

          <div className='flex justify-center flex-col items-start'>
            <div className='flex items-center gap-2'>
              <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
              <Controller
                name='value'
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputCurrency id='borrower-movement-value' error={errors.value?.message} onChange={onChange} value={value} />
                )}
              />
            </div>

            <span className='text-gray-600 tracking-[-0.5px] text-xs'>{copy.valueLabel}</span>
          </div>

          <div className='mt-10 flex flex-col gap-4'>
            <Controller
              control={control}
              name='bankAccountId'
              render={({ field: { onChange, value } }) => (
                <Select
                  id='borrower-movement-bank-account'
                  placeholder={copy.accountLabel}
                  onChange={onChange}
                  value={value}
                  error={errors.bankAccountId?.message}
                  options={accounts.map(account => ({ value: account.id, label: account.name }))}
                />
              )}
            />

            <Controller
              control={control}
              name='date'
              render={({ field: { value, onChange } }) => (
                <DatePickerInput id='borrower-movement-date' error={errors.date?.message} value={value} onChange={onChange} />
              )}
            />

            <p className='text-sm text-gray-700 tracking-[-0.5px]'>{copy.note}</p>
          </div>

          <Button id='borrower-movement-confirm' type='submit' className='w-full mt-6' isLoading={isLoading}>
            {copy.submit}
          </Button>
        </form>
      )}
    </Modal>
  )
}
