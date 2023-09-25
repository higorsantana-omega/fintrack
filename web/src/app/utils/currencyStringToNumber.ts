export function currencyStringToNumber(value: string | number) {
  if (typeof value === 'number') return value

  const sanitize = value
    .replace(/\./g, '')
    .replace(',', '.')
  return Number(sanitize)
}