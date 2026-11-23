const DAY_MS = 24 * 60 * 60 * 1000;

export type DueOption = 'none' | 'today' | 'tomorrow' | 'nextWeek';

const OFFSET_DAYS: Record<Exclude<DueOption, 'none'>, number> = {
  today: 0,
  tomorrow: 1,
  nextWeek: 7,
};

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Whole calendar days from `now` to `date` (negative = in the past). */
function daysFromToday(date: Date, now: Date): number {
  return Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );
}

/** A quick-pick option → end of that local day, stored as UTC ISO. */
export function dueOptionToIso(
  option: DueOption,
  now: Date = new Date(),
): string | null {
  if (option === 'none') return null;
  const due = new Date(now);
  due.setDate(due.getDate() + OFFSET_DAYS[option]);
  due.setHours(23, 59, 0, 0);
  return due.toISOString();
}

/** Which quick-pick option a stored date matches (null = some other date). */
export function dueOptionFromIso(
  iso: string | null,
  now: Date = new Date(),
): DueOption | null {
  if (iso === null) return 'none';
  const days = daysFromToday(new Date(iso), now);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === 7) return 'nextWeek';
  return null;
}

export type DueLabel = {
  label: string;
  tone: 'overdue' | 'today' | 'upcoming';
};

/** "Today", "Tomorrow", "Mon", "28 Nov", "Overdue · 19 Nov". */
export function describeDue(
  iso: string | null,
  now: Date = new Date(),
): DueLabel | null {
  if (iso === null) return null;
  const due = new Date(iso);
  const days = daysFromToday(due, now);
  const short = due.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  if (days < 0) return { label: `Overdue · ${short}`, tone: 'overdue' };
  if (days === 0) return { label: 'Today', tone: 'today' };
  if (days === 1) return { label: 'Tomorrow', tone: 'upcoming' };
  if (days < 7)
    return {
      label: due.toLocaleDateString('en-GB', { weekday: 'short' }),
      tone: 'upcoming',
    };
  return { label: short, tone: 'upcoming' };
}

export function isDueToday(
  iso: string | null,
  now: Date = new Date(),
): boolean {
  return iso !== null && daysFromToday(new Date(iso), now) <= 0;
}

/** "21 Nov 2026, 19:42" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Saturday, 21 November" */
export function formatToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
