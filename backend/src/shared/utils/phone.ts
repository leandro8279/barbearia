/** Só dígitos, sem o DDI 55 do Brasil. Devolve null se sobrar menos de 10 dígitos. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('55') && [12, 13].includes(digits.length) ? digits.slice(2) : digits;

  return national.length >= 10 ? national : null;
}
