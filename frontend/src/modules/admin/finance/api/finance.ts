import {apiRequest, buildQuery} from '@/shared/lib/http'

export type FinanceBasis = 'cash' | 'accrual'
export type ExpenseRecordStatus = 'open' | 'paid'
export type ExpenseDisplayStatus = ExpenseRecordStatus | 'overdue'

export interface FinanceMetrics {
  revenueCents: number
  expensesCents: number
  profitCents: number
  averageTicketCents: number
  commissionsToPayCents: number
  tabsCount: number
}

export interface FinanceSummary {
  basis: FinanceBasis
  metrics: FinanceMetrics
  previous: FinanceMetrics
  monthly: Array<{month: string; incomeCents: number; expensesCents: number}>
  paymentMethods: Array<{method: 'cash' | 'pix' | 'debit' | 'credit'; amountCents: number}>
}

export interface FinanceSummaryFilters {
  from: string
  to: string
  basis: FinanceBasis
}

export interface ExpenseCategory {
  id: number
  name: string
  slug: string
}

export interface Expense {
  id: number
  description: string
  category: string
  amountCents: number
  dueAt: string
  status: ExpenseRecordStatus
  displayStatus: ExpenseDisplayStatus
  recurring: boolean
  createdAt: string
  paidAt: string | null
}

export interface ExpenseInput {
  description: string
  category: string
  amountCents: number
  dueAt: string
  recurring: boolean
}

export interface ExpenseQuery {
  page: number
  pageSize: number
  query: string
  category?: string
  status: 'all' | 'open' | 'paid' | 'overdue'
  from?: string
  to?: string
}

export interface ExpensePage {
  items: Expense[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export async function getFinanceSummary(filters: FinanceSummaryFilters) {
  return apiRequest<FinanceSummary>(`/admin/finance/summary${buildQuery({from: filters.from, to: filters.to, basis: filters.basis})}`)
}

export async function getExpenseCategories() {
  return apiRequest<ExpenseCategory[]>('/admin/finance/expense-categories')
}

export async function getExpenses(params: ExpenseQuery) {
  return apiRequest<ExpensePage>(
    `/admin/finance/expenses${buildQuery({
      page: params.page,
      pageSize: params.pageSize,
      q: params.query,
      category: params.category,
      status: params.status,
      from: params.from,
      to: params.to,
      sortBy: 'dueAt',
      order: 'asc'
    })}`
  )
}

export async function saveExpense(id: number | null, input: ExpenseInput) {
  return apiRequest<Expense>(id ? `/admin/finance/expenses/${id}` : '/admin/finance/expenses', {method: id ? 'PATCH' : 'POST', body: JSON.stringify(input)})
}

export async function markExpensePaid(id: number) {
  return apiRequest<Expense>(`/admin/finance/expenses/${id}/mark-paid`, {method: 'POST'})
}
