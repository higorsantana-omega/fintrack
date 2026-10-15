import { CrossCircledIcon } from '@radix-ui/react-icons'
import { DebtDetail } from '../../../../../app/entities/Debt'
import { cn } from '../../../../../app/utils/cn'
import { MAX_DEBT_INSTALLMENTS } from '../../../../../app/utils/debtForm'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { useEditDebtModalController } from './useEditDebtModalController'

interface EditDebtModalProps {
  debt: DebtDetail
  onClose(): void
}

export function EditDebtModal({ debt, onClose }: EditDebtModalProps) {
  const { register, errors, handleSubmit, isLoading } = useEditDebtModalController(debt, onClose)

  return (
    <Modal title='Editar dívida' open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex flex-col gap-4'>
          <Input
            id='debtName'
            type='text'
            placeholder='Nome da dívida'
            error={errors.name?.message}
            {...register('name')}
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

          {!debt.hasPayment && (
            <>
              <Input
                id='debtInstallmentsCount'
                type='number'
                min={1}
                max={MAX_DEBT_INSTALLMENTS}
                placeholder='Total de parcelas'
                error={errors.installmentsCount?.message}
                {...register('installmentsCount')}
              />

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
            </>
          )}
        </div>

        <p className='mt-4 text-sm text-gray-700 tracking-[-0.5px]'>
          {debt.hasPayment
            ? 'O novo dia de vencimento vale para as parcelas em aberto. O total e a próxima parcela não mudam depois do primeiro pagamento.'
            : 'O novo dia de vencimento vale para todas as parcelas em aberto.'}
        </p>

        <Button id='debtSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}
