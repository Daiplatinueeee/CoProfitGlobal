export function dayKeyFromDate(d: Date): string {
  // YYYY-MM-DD in UTC
  return d.toISOString().slice(0, 10);
}

export function monthKeyFromDate(d: Date): string {
  // YYYY-MM in UTC
  return d.toISOString().slice(0, 7);
}

export function parseIsoDateOrNow(iso?: string): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid ISO date');
  return d;
}

export function leadershipWindowForMonth(monthKey: string): { windowStart: Date; windowEnd: Date } {
  // monthKey = YYYY-MM
  const [yStr, mStr] = monthKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m || m < 1 || m > 12) throw new Error('Invalid monthKey');

  // 15th 00:00 UTC
  const windowStart = new Date(Date.UTC(y, m - 1, 15, 0, 0, 0, 0));
  // 30th 23:59:59.999 UTC (15-day compliance window)
  const windowEnd = new Date(Date.UTC(y, m - 1, 30, 23, 59, 59, 999));

  return { windowStart, windowEnd };
}

export function monthRange(monthKey: string): { start: Date; end: Date } {
  const [yStr, mStr] = monthKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m || m < 1 || m > 12) throw new Error('Invalid monthKey');

  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return { start, end };
}