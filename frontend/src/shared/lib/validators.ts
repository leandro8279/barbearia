function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function hasRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value)
}

function calculateDigit(base: string, weights: number[]): number {
  const sum = base.split('').reduce((total, digit, index) => total + Number(digit) * weights[index], 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false
  const first = calculateDigit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calculateDigit(cpf.slice(0, 9) + first, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return cpf.endsWith(`${first}${second}`)
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false
  const first = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calculateDigit(cnpj.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return cnpj.endsWith(`${first}${second}`)
}

export function isValidBrazilianPhone(value: string): boolean {
  const phone = onlyDigits(value).replace(/^55/, '')
  if (phone.length !== 10 && phone.length !== 11) return false
  const areaCode = Number(phone.slice(0, 2))
  if (areaCode < 11 || areaCode > 99) return false
  const localNumber = phone.slice(2)
  return localNumber.length === 9 ? /^9\d{8}$/.test(localNumber) : /^[2-5]\d{7}$/.test(localNumber)
}

export const validators = {cpf: isValidCPF, cnpj: isValidCNPJ, phone: isValidBrazilianPhone}
