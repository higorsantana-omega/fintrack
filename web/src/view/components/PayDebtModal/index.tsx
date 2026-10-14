import { Link } from 'react-router-dom'
import { Controller } from 'react-hook-form'
import { DebtDetail } from '../../../app/entities/Debt'
import { useDebt } from '../../../app/hooks/useDebt'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatDate } from '../../../app/utils/formatDate'
import { INSTALLMENT_STATE_LABELS } from '../../constants/DebtConstants'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Select } from '../Select'
import { Spinner } from '../Spinner'
import { InputCurrency } from '../InputCurrency'
import { DatePickerInput } from '../DatePickerInput'
import { PayDebtTarget } from './PayDebtContext'
import { usePayDebtModalController } from './usePayDebtModalController'

interface PayDebtModalProps {
  target: PayDebtTarget
  onClose(): void
  onPaid(): void
}

export function PayDebtModal({ target, onClose, onPaid }: PayDebtModalProps) {
  const { debt, isError } = useDebt(target.debtId)

  return (
    <Modal title='Pagar dívida' open onClose={onClose}>
      <strong id='pay-debt-title' className='text-gray-800 tracking-[-0.5px] text-lg block'>
        {target.debtName}
      </strong>

      {!debt && !isError && (
        <div className='flex justify-center'>
          <Spinner className='w-8 h-8' />
        </div>
      )}

      {!debt && isError && (
        <p className='text-gray-800 tracking-[-0.5px]'>Não foi possível carregar a dívida. Tente novamente.</p>
      )}

      {debt && (
        <PayDebtForm
          debt={debt}
          initialNumbers={target.initialNumbers ?? []}
          onClose={onClose}
          onPaid={onPaid}
        />
      )}
    </Modal>
  )
}

interface PayDebtFormProps {
  debt: DebtDetail
  initialNumbers: number[]
  onClose(): void
  onPaid(): void
}

function PayDebtForm({ debt, initialNumbers, onClose, onPaid }: PayDebtFormProps) {
  const {
    accounts,
    control,
    errors,
    handleSubmit,
    isLoading,
    openInstallments,
    selected,
    expectedSum,
    years,
    shortcuts,
    lastShortcut,
    conflictMessage,
    toggleInstallment,
    toggleYear,
    handleValueChange
  } = usePayDebtModalController(debt, initialNumbers, onPaid)

  if (openInstallments.length === 0) {
    return <p className='text-gray-800 tracking-[-0.5px]'>Todas as parcelas desta dívida já estão pagas.</p>
  }

  if (accounts.length === 0) {
    return (
      <div className='flex flex-col items-center text-center gap-6'>
        <p className='text-gray-800 tracking-[-0.5px]'>
          Para pagar parcelas, cadastre antes uma conta no Dashboard. É dela que sai o pagamento.
        </p>
        <Link
          to='/'
          onClick={onClose}
          className='bg-teal-900 hover:bg-teal-800 px-6 h-12 rounded-2xl font-medium text-white flex items-center justify-center w-full'
        >
          Ir para o Dashboard
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='space-y-3'>
        <span className='text-gray-600 tracking-[-0.5px] text-sm block'>Parcelas em aberto</span>

        <div className='flex flex-wrap gap-2'>
          {shortcuts.map(shortcut => (
            <Button
              key={shortcut.id}
              id={`pay-debt-shortcut-${shortcut.id}`}
              type='button'
              ghost
              className='h-10 px-3 text-sm'
              disabled={shortcut.disabled}
              onClick={shortcut.onSelect}
            >
              {shortcut.label}
            </Button>
          ))}
        </div>

        <div className='flex items-center gap-2'>
          <Button
            id='pay-debt-shortcut-last'
            type='button'
            ghost
            className='h-10 px-3 text-sm'
            disabled={lastShortcut.isDisabled}
            onClick={lastShortcut.onSelect}
          >
            As últimas
          </Button>
          <input
            id='pay-debt-last-count'
            type='number'
            min={1}
            max={openInstallments.length}
            aria-label='Quantidade de parcelas'
            className='w-20 h-10 rounded-lg border border-gray-500 px-3 text-gray-800 outline-none focus:border-gray-800'
            value={lastShortcut.count}
            onChange={event => lastShortcut.onCountChange(event.target.value)}
          />
          <span className='text-sm text-gray-700 tracking-[-0.5px]'>parcelas</span>
        </div>

        <div className='max-h-64 overflow-y-auto space-y-2'>
          {years.map(({ year, installments, selectedCount, isExpanded }) => (
            <div key={year} className='rounded-2xl bg-gray-50'>
              <button
                id={`pay-debt-year-${year}`}
                type='button'
                aria-expanded={isExpanded}
                className='w-full px-3 h-10 flex items-center justify-between text-sm font-medium text-gray-800 tracking-[-0.5px]'
                onClick={() => toggleYear(year, isExpanded)}
              >
                <span>{year}</span>
                <span className='text-gray-600 font-normal'>
                  {selectedCount > 0 ? `${selectedCount} de ${installments.length} marcadas` : `${installments.length} em aberto`}
                </span>
              </button>

              {isExpanded && installments.map(installment => (
                <label
                  key={installment.number}
                  htmlFor={`pay-debt-installment-${installment.number}`}
                  className='px-3 py-2 flex items-center gap-3 text-sm text-gray-800 tracking-[-0.5px] cursor-pointer'
                >
                  <input
                    id={`pay-debt-installment-${installment.number}`}
                    type='checkbox'
                    className='w-4 h-4 accent-teal-900'
                    checked={selected.some(({ number }) => number === installment.number)}
                    onChange={() => toggleInstallment(installment.number)}
                  />
                  <span className='flex-1'>
                    <strong>Parcela {installment.number}/{debt.installmentsCount}</strong>
                    <span className='block text-xs text-gray-600'>
                      {formatDate(new Date(installment.dueDate))} · {INSTALLMENT_STATE_LABELS[installment.state]}
                    </span>
                  </span>
                  <span>{formatCurrency(installment.expectedValue)}</span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <span className='text-sm text-gray-700 tracking-[-0.5px] block'>
          Previsto das marcadas: <strong id='pay-debt-expected'>{formatCurrency(expectedSum)}</strong>
        </span>
      </div>

      <div className='flex justify-center flex-col items-start'>
        <div className='flex items-center gap-2'>
          <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
          <Controller
            name='value'
            control={control}
            render={({ field: { onChange, value } }) => (
              <InputCurrency
                id='pay-debt-value'
                error={errors.value?.message}
                onChange={handleValueChange(onChange)}
                value={value}
              />
            )}
          />
        </div>

        <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor pago</span>
      </div>

      <div className='flex flex-col gap-4'>
        <Controller
          control={control}
          name='bankAccountId'
          render={({ field: { onChange, value } }) => (
            <Select
              id='pay-debt-bank-account'
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
            <DatePickerInput id='pay-debt-date' error={errors.date?.message} value={value} onChange={onChange} />
          )}
        />

        <p className='text-sm text-gray-700 tracking-[-0.5px]'>
          Sai da conta como uma despesa na categoria Dívidas.
        </p>
      </div>

      {conflictMessage && (
        <p id='pay-debt-conflict' role='alert' className='text-sm text-red-900 tracking-[-0.5px]'>
          {conflictMessage}
        </p>
      )}

      <Button
        id='pay-debt-confirm'
        type='submit'
        className='w-full'
        isLoading={isLoading}
        disabled={selected.length === 0}
      >
        Registrar pagamento
      </Button>
    </form>
  )
}
