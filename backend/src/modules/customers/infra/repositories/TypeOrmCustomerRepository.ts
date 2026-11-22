import type { CustomerSummary } from '@/modules/customers/domain/entities/CustomerSummary';
import { ICustomerRepository } from '@/modules/customers/domain/repositories/CustomerRepositoryInterface';

import { DataSource } from 'typeorm';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  guest: number | boolean;
  tags: string | null;
  lastVisit: string | null;
  visitsCount: number;
  totalSpentCents: number;
}

const CUSTOMERS_WITH_METRICS_SQL = `
  SELECT u.id, u.name, u.phone, u.birth_date AS birthDate, u.guest, u.tags,
         v.last_visit AS lastVisit,
         COALESCE(v.visits, 0) AS visitsCount,
         COALESCE(s.spent, 0) AS totalSpentCents
  FROM users u
  LEFT JOIN (
    SELECT customer_id, MAX(start_at) AS last_visit, COUNT(*) AS visits
    FROM appointments
    WHERE status = 'done'
    GROUP BY customer_id
  ) v ON v.customer_id = u.id
  LEFT JOIN (
    SELECT t.customer_id, SUM(ti.qty * ti.unit_price - ti.discount) AS spent
    FROM tabs t
    JOIN tab_items ti ON ti.tab_id = t.id
    WHERE t.status = 'closed'
    GROUP BY t.customer_id
  ) s ON s.customer_id = u.id
  WHERE u.role = 'customer'
`;

function parseUtcDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(/z$/i.test(value) ? value : `${value.replace(' ', 'T')}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export class TypeOrmCustomerRepository implements ICustomerRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAllWithMetrics(): Promise<CustomerSummary[]> {
    const rows: CustomerRow[] = await this.dataSource.query(CUSTOMERS_WITH_METRICS_SQL);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      birthDate: row.birthDate,
      guest: Boolean(row.guest),
      tags: parseTags(row.tags),
      lastVisit: parseUtcDate(row.lastVisit),
      visitsCount: Number(row.visitsCount),
      totalSpentCents: Number(row.totalSpentCents),
    }));
  }
}
