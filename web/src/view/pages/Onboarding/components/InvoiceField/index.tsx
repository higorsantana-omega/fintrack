import { Check } from 'lucide-react'
import { CardInvoice } from '../../../../../app/entities/CreditCard'
import { InputCurrency } from '../../../../components/InputCurrency'
import { useInvoiceFieldController } from './useInvoiceFieldController'

interface InvoiceFieldProps {
  cardId: string
  invoice: CardInvoice
  label: string
  help: string
  correctionId: string
}

export function InvoiceField({ cardId, invoice, label, help, correctionId }: InvoiceFieldProps) {
  const { id, value, handleChange, save, isSaving, isLoading, isSuccess, isError } = useInvoiceFieldController({
    cardId,
    invoice,
    correctionId
  })

  return (
    <div className='p-4 rounded-2xl border border-gray-200 flex flex-col gap-2'>
      <div>
        <label htmlFor={id} className='block font-medium text-gray-800 tracking-[-0.5px]'>{label}</label>
        <span className='block text-sm text-gray-600 tracking-[-0.5px]'>{help}</span>
      </div>

      <div
        className='flex items-center gap-2'
        onBlur={save}
        onKeyDown={event => event.key === 'Enter' && (event.target as HTMLElement).blur()}
      >
        <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
        <div className='flex-1 min-w-0'>
          <InputCurrency id={id} value={value} onChange={handleChange} readOnly={isSaving} />
        </div>

        <span aria-live='polite' className='shrink-0 text-sm tracking-[-0.5px]'>
          {isLoading && <span className='text-gray-600'>Salvando</span>}
          {isSuccess && (
            <span className='flex items-center gap-1 text-teal-900'>
              <Check className='w-4 h-4' />
              Salvo
            </span>
          )}
          {isError && <span className='text-red-800'>Erro ao salvar</span>}
        </span>
      </div>
    </div>
  )
}
