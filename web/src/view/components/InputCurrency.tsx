import { CrossCircledIcon } from '@radix-ui/react-icons'
import { NumericFormat } from 'react-number-format'

interface InputCurrencyProps {
  id?: string
  error?: string
  onChange?(value: string): void
  value?: string | number
}

export function InputCurrency ({ id, error, onChange, value }: InputCurrencyProps) {
  return (
    <div>
      <NumericFormat
        id={id}
        className='w-full text-gray-800 text-[32px] tracking-[-1px] font-bold outline-none'
        thousandSeparator='.'
        decimalSeparator=','
        // The value comes back formatted ('1.000'); without this it is
        // guessed as the numeric string 1.000 and shown as '1,000'.
        valueIsNumericString={false}
        value={value}
        defaultValue='0,00'
        onChange={event => onChange?.(event.target.value)}
      />

      {error && (
        <div className='flex gap-2 items-center mt-2 text-red-900'>
          <CrossCircledIcon />
          <span className='text-xs'>{error}</span>
        </div>
      )}
    </div>
  )
}
