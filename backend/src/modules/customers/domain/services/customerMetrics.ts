const DAY_MS = 24 * 60 * 60 * 1000;

export interface CustomerMetrics {
  visitsCount: number;
  averageTicketCents: number;
  medianIntervalDays: number | null;
  lastVisit: Date | null;
  totalSpentCents: number;
}

export function computeCustomerMetrics(visitDates: Date[], tabTotalsCents: number[]): CustomerMetrics {
  const times = visitDates
    .map((date) => date.getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const intervals = times
    .slice(1)
    .map((time, index) => (time - times[index]) / DAY_MS)
    .sort((a, b) => a - b);

  const middle = Math.floor(intervals.length / 2);
  const median = intervals.length % 2 ? intervals[middle] : (intervals[middle - 1] + intervals[middle]) / 2;

  const totalSpentCents = tabTotalsCents.reduce((sum, total) => sum + total, 0);

  return {
    visitsCount: visitDates.length,
    averageTicketCents: tabTotalsCents.length ? Math.round(totalSpentCents / tabTotalsCents.length) : 0,
    medianIntervalDays: intervals.length ? Math.round(median * 10) / 10 : null,
    lastVisit: times.length ? new Date(times[times.length - 1]) : null,
    totalSpentCents,
  };
}
