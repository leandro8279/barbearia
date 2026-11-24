export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCnpj(value: string): boolean {
  const digits = normalizeCnpj(value);
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

  const checkDigit = (base: string, weights: number[]) => {
    const remainder = base.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11;

    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = checkDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(digits.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits.endsWith(`${first}${second}`);
}
