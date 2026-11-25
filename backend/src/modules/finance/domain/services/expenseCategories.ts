export const EXPENSE_CATEGORIES = [
  { slug: 'aluguel', name: 'Aluguel' },
  { slug: 'energia', name: 'Energia' },
  { slug: 'produtos', name: 'Produtos' },
  { slug: 'comissoes', name: 'Comissões' },
  { slug: 'marketing', name: 'Marketing' },
] as const;

const LEGACY_CATEGORY_ALIASES: ReadonlyMap<string, string> = new Map([
  ['Estrutura', 'Aluguel'],
  ['Insumos', 'Produtos'],
  ['Utilidades', 'Energia'],
]);

export const normalizeCategoryName = (value: string): string => LEGACY_CATEGORY_ALIASES.get(value) ?? value;

export function resolveCategoryFilter(value: string): string[] {
  const canonical = EXPENSE_CATEGORIES.find((category) => category.slug === value || category.name === value)?.name ?? normalizeCategoryName(value);
  const aliases = [...LEGACY_CATEGORY_ALIASES].filter(([, target]) => target === canonical).map(([legacy]) => legacy);

  return [canonical, ...aliases];
}
