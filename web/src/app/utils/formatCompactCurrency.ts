const compactCurrencyFormatter = Intl.NumberFormat('pt-br', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1
})

export function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value)
}
