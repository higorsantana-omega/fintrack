import { Link } from 'react-router-dom'
import { Controller } from 'react-hook-form'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatMonth } from '../../../app/utils/formatMonth'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Select } from '../Select'
import { InputCurrency } from '../InputCurrency'
import { DatePickerInput } from '../DatePickerInput'
import { PayInvoiceTarget } from './PayInvoiceContext'
import { usePayInvoiceModalController } from './usePayInvoiceModalController'

interface PayInvoiceModalProps {
  target: PayInvoiceTarget
  onClose(): void
  onPaid(): void
}

export function PayInvoiceModal({ target, onClose, onPaid }: PayInvoiceModalProps) {
  const { accounts, control, errors, handleSubmit, isLoading } = usePayInvoiceModalController(target, onPaid)

  return (
    <Modal title='Pagar fatura' open onClose={onClose}>
      <div className='space-y-1'>
        <strong id='pay-invoice-title' className='text-gray-800 tracking-[-0.5px] text-lg block'>
          Fatura {target.cardName} {formatMonth(target.month)}
        </strong>
        <span className='text-sm text-gray-700 tracking-[-0.5px]'>
          Saldo a pagar: <strong>{formatCurrency(target.balance)}</strong>
        </span>
      </div>

      {accounts.length === 0 && (
        <div className='flex flex-col items-center text-center gap-6'>
          <p className='text-gray-800 tracking-[-0.5px]'>
            Para pagar a fatura, cadastre antes uma conta no Dashboard. É dela que sai o pagamento.
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
          <div className='flex justify-center flex-col items-start'>
            <div className='flex items-center gap-2'>
              <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
              <Controller
                name='value'
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputCurrency id='paymentValue' error={errors.value?.message} onChange={onChange} value={value} />
                )}
              />
            </div>

            <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor do pagamento</span>
          </div>

          <div className='mt-10 flex flex-col gap-4'>
            <Controller
              control={control}
              name='bankAccountId'
              render={({ field: { onChange, value } }) => (
                <Select
                  id='paymentBankAccountId'
                  placeholder='Pagar com a conta'
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
                <DatePickerInput id='paymentDate' error={errors.date?.message} value={value} onChange={onChange} />
              )}
            />

            <p className='text-sm text-gray-700 tracking-[-0.5px]'>
              Sai da conta como despesa na categoria Fatura de cartão.
            </p>
          </div>

          <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
            Registrar pagamento
          </Button>
        </form>
      )}
    </Modal>
  )
}
