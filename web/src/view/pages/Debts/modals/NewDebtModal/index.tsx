import { Controller } from 'react-hook-form'
import { CrossCircledIcon } from '@radix-ui/react-icons'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Select } from '../../../../components/Select'
import { cn } from '../../../../../app/utils/cn'
import { MAX_DEBT_INSTALLMENTS } from '../../../../../app/utils/debtForm'
import { useNewDebtModalController } from './useNewDebtModalController'

interface NewDebtModalProps {
  open: boolean
  onClose(): void
}

export function NewDebtModal({ open, onClose }: NewDebtModalProps) {
  const { register, errors, control, handleSubmit, isLoading, hasEntry, accounts } = useNewDebtModalController(onClose)

  return (
    <Modal title='Nova dívida' open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex flex-col gap-4'>
          <div>
            <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor da parcela</span>
            <div className='flex items-center gap-1'>
              <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
              <Controller
                name='installmentValue'
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputCurrency id='debtInstallmentValue' error={errors.installmentValue?.message} onChange={onChange} value={value} />
                )}
              />
            </div>
          </div>

          <Input
            id='debtName'
            type='text'
            placeholder='Nome da dívida'
            error={errors.name?.message}
            {...register('name')}
          />

          <div className='grid grid-cols-2 gap-4'>
            <Input
              id='debtInstallmentsCount'
              type='number'
              min={1}
              max={MAX_DEBT_INSTALLMENTS}
              placeholder='Total de parcelas'
              error={errors.installmentsCount?.message}
              {...register('installmentsCount')}
            />
            <Input
              id='debtDueDay'
              type='number'
              min={1}
              max={31}
              placeholder='Dia do vencimento'
              error={errors.dueDay?.message}
              {...register('dueDay')}
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <Input
              id='debtNextInstallment'
              type='number'
              min={1}
              max={MAX_DEBT_INSTALLMENTS}
              placeholder='Próxima parcela'
              error={errors.nextInstallment?.message}
              {...register('nextInstallment')}
            />

            <div>
              <span className='text-gray-600 tracking-[-0.5px] text-xs block mb-1'>Vence em</span>
              <input
                id='debtNextInstallmentMonth'
                type='month'
                className={cn(
                  'bg-white w-full rounded-lg border border-gray-500 px-3 h-[52px] text-gray-800 focus:border-gray-800 transition-all outline-none',
                  errors.nextInstallmentMonth && '!border-red-900'
                )}
                {...register('nextInstallmentMonth')}
              />
              {errors.nextInstallmentMonth && (
                <div className='flex gap-2 items-center mt-2 text-red-900'>
                  <CrossCircledIcon />
                  <span className='text-xs'>{errors.nextInstallmentMonth.message}</span>
                </div>
              )}
            </div>
          </div>

          <label className='flex items-center gap-2 text-sm text-gray-800 tracking-[-0.5px]'>
            <input
              id='debtHasEntry'
              type='checkbox'
              className='w-4 h-4 accent-teal-900'
              {...register('hasEntry')}
            />
            O dinheiro do empréstimo entrou numa conta
          </label>

          {hasEntry && (
            <>
              <Controller
                control={control}
                name='entryBankAccountId'
                render={({ field: { onChange, value } }) => (
                  <Select
                    id='debtEntryBankAccountId'
                    placeholder='Conta que recebeu'
                    onChange={onChange}
                    value={value}
                    error={errors.entryBankAccountId?.message}
                    options={accounts.map(account => ({ value: account.id, label: account.name }))}
                  />
                )}
              />

              <div>
                <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor recebido</span>
                <div className='flex items-center gap-1'>
                  <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
                  <Controller
                    name='entryValue'
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputCurrency id='debtEntryValue' error={errors.entryValue?.message} onChange={onChange} value={value} />
                    )}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <Button id='debtSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Cadastrar dívida
        </Button>
      </form>
    </Modal>
  )
}
