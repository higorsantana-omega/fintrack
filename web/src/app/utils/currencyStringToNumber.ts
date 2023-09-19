export function currencyStringToNumber(value: string) {
  const sanitize = value
    .replace(/\./g, '')
    .replace(',', '.')
  return Number(sanitize)
}