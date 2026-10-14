import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { ColorsDropdownInput } from '../../../../components/ColorsDropdownInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useEditAccountModalController } from './useEditAccountModalController'
import { TrashIcon } from '@radix-ui/react-icons'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { formatMonth } from '../../../../../app/utils/formatMonth'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'

function formatInstallments(installments: number[]) {
  const label = installments.length > 1 ? 'parcelas' : 'parcela'
  const numbers = installments.length > 1
    ? `${installments.slice(0, -1).join(', ')} e ${installments[installments.length - 1]}`
    : String(installments[0])

  return `${label} ${numbers}`
}

export function EditAccountModal() {
  const {
    isEditAccountModalOpen,
    toggleOpenEditAccountModal,
    errors,
    handleSubmit,
    register,
    control,
    isLoading,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    isDeleteModalOpen,
    handleDeleteAccount,
    handleConfirmDeleteAccount,
    deletionImpact,
    handleCloseDeletionImpactModal,
    isLoadingDelete
  } = useEditAccountModalController()

  if (deletionImpact) {
    const { invoices, debts, borrowers } = deletionImpact

    return <ConfirmDeleteModal
      isLoading={isLoadingDelete}
      onConfirm={handleConfirmDeleteAccount}
      onClose={handleCloseDeletionImpactModal}
      title='Esta conta tem pagamentos e movimentações ligados'
      description={(
        <>
          <p>Ao excluir a conta, esses pagamentos e movimentações também serão excluídos:</p>

          {invoices.length > 0 && (
            <>
              <p className='mt-4'>Estas faturas voltarão a ter saldo a pagar:</p>

              <ul id='reopened-invoices' className='mt-2 space-y-1 font-medium'>
                {invoices.map(invoice => (
                  <li key={`${invoice.cardId}-${invoice.month}`}>
                    {`Fatura ${invoice.cardName} ${formatMonth(invoice.month)}`}
                  </li>
                ))}
              </ul>
            </>
          )}

          {debts.length > 0 && (
            <>
              <p className='mt-4'>Estas parcelas de dívidas voltarão a ficar em aberto:</p>

              <ul id='reopened-debts' className='mt-2 space-y-1 font-medium'>
                {debts.map(debt => (
                  <li key={debt.debtId}>
                    {`${debt.name}: ${formatInstallments(debt.installments)} ${debt.installments.length > 1 ? 'voltam' : 'volta'} a ficar em aberto`}
                  </li>
                ))}
              </ul>
            </>
          )}

          {borrowers.length > 0 && (
            <>
              <p className='mt-4'>Estes saldos de pessoas vão mudar:</p>

              <ul id='changed-borrowers' className='mt-2 space-y-1 font-medium'>
                {borrowers.map(borrower => (
                  <li key={borrower.borrowerId}>
                    {`${borrower.name}: saldo ${borrower.change >= 0 ? 'sobe' : 'desce'} ${formatCurrency(Math.abs(borrower.change))}`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    />
  }

  if (isDeleteModalOpen) {
    return <ConfirmDeleteModal
      isLoading={isLoadingDelete}
      onConfirm={handleDeleteAccount}
      onClose={handleCloseDeleteModal}
      title='Tem certeza que deseja excluir esta conta?'
      description='Ao excluir a conta, tambem serao excluidos todos os registros de receitas e despesas relacionados'
    />
  }

  return (
    <Modal title='Editar conta' open={isEditAccountModalOpen} onClose={toggleOpenEditAccountModal} rightAction={(
      <button onClick={handleOpenDeleteModal}>
        <TrashIcon className='w-6 h-6 text-red-900' />
      </button>
    )}>
      <form onSubmit={handleSubmit}>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            
            <Controller 
              name='initialBalance'
              control={control}
              defaultValue='0,00'
              render={({ field: { onChange, value } }) => (
                <InputCurrency error={errors.initialBalance?.message} onChange={onChange} value={value} />
              )}
            />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Saldo</span>
        </div>

        <div className='mt-10 flex flex-col gap-4'>
          <Input 
            type='text'
            error={errors.name?.message}
            placeholder='Nome da conta'
            {...register('name')}
          />

          <Controller 
            control={control}
            name='type'
            defaultValue='CHECKING'
            render={({ field: { onChange, value }}) => (
              <Select
                placeholder='Tipo'
                error={errors.type?.message}
                onChange={onChange}
                value={value}
                options={[
                  {
                    value: 'CHECKING',
                    label: 'Conta corrente'
                  },
                  {
                    value: 'INVESTMENT',
                    label: 'Investimentos'
                  },
                  {
                    value: 'CASH',
                    label: 'Dinheiro'
                  }
                ]}
              />
            )}
          />

          <Controller 
            control={control}
            name='color'
            render={({ field: { onChange, value }}) => (
              <ColorsDropdownInput
                error={errors.color?.message}
                onChange={onChange}
                value={value}
              />
            )}
          />
        </div>

        <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}