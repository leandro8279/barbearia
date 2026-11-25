import { AppointmentEntity } from '@/modules/appointments/infra/entities/AppointmentEntity';
import { CommissionEntity } from '@/modules/commissions/infra/entities/CommissionEntity';
import type {
  DatedAmount,
  FinanceBasis,
  FinanceFacts,
  IncomeFact,
  PaymentFact,
} from '@/modules/finance/domain/entities/FinanceSummary';
import { FinanceFactsQuery, IFinanceSummaryRepository } from '@/modules/finance/domain/repositories/FinanceSummaryRepositoryInterface';
import { ExpenseEntity } from '@/modules/finance/infra/entities/ExpenseEntity';
import { PaymentEntity } from '@/modules/tabs/infra/entities/PaymentEntity';
import { TabEntity } from '@/modules/tabs/infra/entities/TabEntity';

import { DataSource, Repository } from 'typeorm';

/** Competência: início do atendimento; sem agendamento, o fechamento da comanda. */
const ACCRUAL_TAB_DATE = 'COALESCE(appointment.start, tab.closedAt)';
/** Caixa: fechamento da comanda (só usado para comissões; receitas usam a data do pagamento). */
const CASH_TAB_DATE = 'tab.closedAt';
/** Total da comanda: itens (com o desconto de cada item) menos o desconto da comanda, mais a gorjeta. */
const TAB_TOTAL_SQL =
  '(SELECT COALESCE(SUM(item.qty * item.unit_price - item.discount), 0) FROM tab_items item WHERE item.tab_id = tab.id) - tab.discount + tab.tip';

/** Datas são guardadas pelo TypeORM/SQLite como `YYYY-MM-DD HH:mm:ss.SSS` (UTC); parâmetros crus precisam do mesmo formato. */
const toDbDatetime = (date: Date): string => date.toISOString().replace('T', ' ').replace('Z', '');

function parseUtcDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(/z$/i.test(value) ? value : `${value.replace(' ', 'T')}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

interface Window {
  from: string;
  to: string;
}

interface DatedRow {
  at: string | null;
  amountCents: number | string;
}

interface TabRow extends DatedRow {
  tabId: string;
}

interface PaymentRow extends TabRow {
  method: string;
}

const toDatedAmounts = (rows: DatedRow[]): DatedAmount[] =>
  rows.flatMap((row) => {
    const at = parseUtcDate(row.at);

    return at ? [{ at, amountCents: Number(row.amountCents) || 0 }] : [];
  });

const toIncomeFacts = (rows: TabRow[]): IncomeFact[] =>
  rows.flatMap((row) => {
    const at = parseUtcDate(row.at);

    return at ? [{ tabId: row.tabId, at, amountCents: Number(row.amountCents) || 0 }] : [];
  });

const toPaymentFacts = (rows: PaymentRow[]): PaymentFact[] =>
  rows.flatMap((row) => {
    const at = parseUtcDate(row.at);

    return at ? [{ tabId: row.tabId, at, amountCents: Number(row.amountCents) || 0, method: row.method }] : [];
  });

export class TypeOrmFinanceSummaryRepository implements IFinanceSummaryRepository {
  private readonly tabs: Repository<TabEntity>;
  private readonly payments: Repository<PaymentEntity>;
  private readonly expenses: Repository<ExpenseEntity>;
  private readonly commissions: Repository<CommissionEntity>;

  constructor(dataSource: DataSource) {
    this.tabs = dataSource.getRepository(TabEntity);
    this.payments = dataSource.getRepository(PaymentEntity);
    this.expenses = dataSource.getRepository(ExpenseEntity);
    this.commissions = dataSource.getRepository(CommissionEntity);
  }

  async findFacts({ basis, from, to }: FinanceFactsQuery): Promise<FinanceFacts> {
    const window: Window = { from: toDbDatetime(from), to: toDbDatetime(to) };

    const [revenue, expenses, commissions] = await Promise.all([
      basis === 'cash' ? this.findCashRevenue(window) : this.findAccrualRevenue(window),
      this.findExpenses(basis, window),
      this.findPendingCommissions(basis, window),
    ]);

    return { ...revenue, expenses, commissions };
  }

  /** Caixa: cada pagamento pago de comanda fechada é uma receita, na data do pagamento. */
  private async findCashRevenue(window: Window): Promise<Pick<FinanceFacts, 'incomes' | 'payments'>> {
    const rows = await this.payments
      .createQueryBuilder('payment')
      .innerJoin(TabEntity, 'tab', 'tab.id = payment.tabId')
      .select('payment.tabId', 'tabId')
      .addSelect('payment.createdAt', 'at')
      .addSelect('payment.amountCents', 'amountCents')
      .addSelect('payment.method', 'method')
      .where('payment.status = :paid', { paid: 'paid' })
      .andWhere('tab.status = :closed', { closed: 'closed' })
      .andWhere('payment.createdAt BETWEEN :from AND :to', window)
      .getRawMany<PaymentRow>();

    const payments = toPaymentFacts(rows);

    return { incomes: payments, payments };
  }

  /** Competência: cada comanda fechada é uma receita (itens - desconto + gorjeta), na data do atendimento. */
  private async findAccrualRevenue(window: Window): Promise<Pick<FinanceFacts, 'incomes' | 'payments'>> {
    const [tabRows, paymentRows] = await Promise.all([
      this.tabs
        .createQueryBuilder('tab')
        .leftJoin(AppointmentEntity, 'appointment', 'appointment.id = tab.appointmentId')
        .select('tab.id', 'tabId')
        .addSelect(ACCRUAL_TAB_DATE, 'at')
        .addSelect(TAB_TOTAL_SQL, 'amountCents')
        .where('tab.status = :closed', { closed: 'closed' })
        .andWhere(`${ACCRUAL_TAB_DATE} BETWEEN :from AND :to`, window)
        .getRawMany<TabRow>(),
      // Os pagamentos só detalham a forma de pagamento das comandas que caíram no período.
      this.payments
        .createQueryBuilder('payment')
        .innerJoin(TabEntity, 'tab', 'tab.id = payment.tabId')
        .leftJoin(AppointmentEntity, 'appointment', 'appointment.id = tab.appointmentId')
        .select('payment.tabId', 'tabId')
        .addSelect(ACCRUAL_TAB_DATE, 'at')
        .addSelect('payment.amountCents', 'amountCents')
        .addSelect('payment.method', 'method')
        .where('payment.status = :paid', { paid: 'paid' })
        .andWhere('tab.status = :closed', { closed: 'closed' })
        .andWhere(`${ACCRUAL_TAB_DATE} BETWEEN :from AND :to`, window)
        .getRawMany<PaymentRow>(),
    ]);

    return { incomes: toIncomeFacts(tabRows), payments: toPaymentFacts(paymentRows) };
  }

  /** Caixa: despesas pagas, na data do pagamento. Competência: todas, no vencimento. */
  private async findExpenses(basis: FinanceBasis, window: Window): Promise<DatedAmount[]> {
    const at = basis === 'cash' ? 'COALESCE(expense.paidAt, expense.createdAt)' : 'expense.dueAt';

    const qb = this.expenses
      .createQueryBuilder('expense')
      .select(at, 'at')
      .addSelect('expense.amountCents', 'amountCents')
      .where(`${at} BETWEEN :from AND :to`, window);

    if (basis === 'cash') qb.andWhere('expense.status = :paid', { paid: 'paid' });

    return toDatedAmounts(await qb.getRawMany<DatedRow>());
  }

  /** Comissões pendentes de comandas fechadas, datadas pela comanda conforme o regime. */
  private async findPendingCommissions(basis: FinanceBasis, window: Window): Promise<DatedAmount[]> {
    const at = basis === 'cash' ? CASH_TAB_DATE : ACCRUAL_TAB_DATE;

    const qb = this.commissions
      .createQueryBuilder('commission')
      .innerJoin(TabEntity, 'tab', 'tab.id = commission.tabId')
      .select(at, 'at')
      .addSelect('commission.amountCents', 'amountCents')
      .where('commission.status = :pending', { pending: 'pending' })
      .andWhere('tab.status = :closed', { closed: 'closed' })
      .andWhere(`${at} BETWEEN :from AND :to`, window);

    if (basis === 'accrual') qb.leftJoin(AppointmentEntity, 'appointment', 'appointment.id = tab.appointmentId');

    return toDatedAmounts(await qb.getRawMany<DatedRow>());
  }
}
