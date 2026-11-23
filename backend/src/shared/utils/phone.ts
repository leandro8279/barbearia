/** Só dígitos, sem o DDI 55 do Brasil. Devolve null se sobrar menos de 10 dígitos. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('55') && [12, 13].includes(digits.length) ? digits.slice(2) : digits;

  return national.length >= 10 ? national : null;
}

/** (**) *****-**88: expõe só os 2 últimos dígitos. */
export function maskPhone(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');

  return digits ? `(**) *****-**${digits.slice(-2)}` : '';
}

/** Fixo (2–5 + 7 dígitos) ou celular (9 + 8 dígitos), com DDD 11–99. */
export function isValidBrazilianPhone(value: string): boolean {
  const national = normalizePhone(value);
  if (!national) return false;

  const areaCode = Number(national.slice(0, 2));
  const local = national.slice(2);

  return areaCode >= 11 && areaCode <= 99 && (/^[2-5]\d{7}$/.test(local) || /^9\d{8}$/.test(local));
}
