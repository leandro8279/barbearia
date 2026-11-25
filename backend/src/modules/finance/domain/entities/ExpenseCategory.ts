export interface ExpenseCategory {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
}

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = Object.freeze([
  { id: 1, name: 'Aluguel', slug: 'aluguel' },
  { id: 2, name: 'Energia', slug: 'energia' },
  { id: 3, name: 'Produtos', slug: 'produtos' },
  { id: 4, name: 'Comissões', slug: 'comissoes' },
  { id: 5, name: 'Marketing', slug: 'marketing' },
]);
