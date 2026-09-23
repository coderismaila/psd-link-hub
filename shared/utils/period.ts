/** The period fields every link carries. Kept structural so both DB rows and DTOs fit. */
export interface PeriodLike {
  periodType: 'monthly' | 'yearly'
  periodYear: number
  periodMonth: number | null
}

/** A date on the calendar, with no time and no timezone attached. */
export interface CalendarDate {
  year: number
  /** 1-12 */
  month: number
  /** 1-31 */
  day: number
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const MS_PER_DAY = 86_400_000

/** `"Sep 2026"` for a monthly link, `"2026"` for a yearly one. */
export function periodLabel(link: PeriodLike): string {
  if (link.periodType === 'yearly' || !link.periodMonth) {
    return String(link.periodYear)
  }

  return `${MONTH_NAMES[link.periodMonth - 1]} ${link.periodYear}`
}

/**
 * The first calendar date on which a link is due to be archived: the day after its period ends,
 * plus the grace days.
 *
 * A September 2026 monthly link with 3 grace days is due on 4 Oct 2026; a 2026 yearly link with
 * the same grace is due on 4 Jan 2027. December rolls over into the next year correctly.
 *
 * The arithmetic runs in UTC purely to get DST-free day addition — the result is a plain calendar
 * date, not an instant.
 */
export function archiveDueDate(link: PeriodLike, graceDays: number): CalendarDate {
  // `Date.UTC` takes a 0-based month, so passing a 1-based `periodMonth` already lands on the
  // first day of the *following* month.
  const periodEnd = link.periodType === 'monthly' && link.periodMonth
    ? Date.UTC(link.periodYear, link.periodMonth, 1)
    : Date.UTC(link.periodYear + 1, 0, 1)

  const due = new Date(periodEnd + graceDays * MS_PER_DAY)

  return { year: due.getUTCFullYear(), month: due.getUTCMonth() + 1, day: due.getUTCDate() }
}

/** The calendar date it currently is in `timeZone` — not the UTC date, which may be a day off. */
export function calendarDateIn(timeZone: string, at: Date = new Date()): CalendarDate {
  // `en-CA` formats as YYYY-MM-DD, which is trivial to split.
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(at).split('-').map(Number)

  return { year: year!, month: month!, day: day! }
}

/** Collapses a calendar date into a single comparable number, e.g. 2026-10-04 becomes 20261004. */
export function calendarDateKey(date: CalendarDate): number {
  return date.year * 10_000 + date.month * 100 + date.day
}

/** `YYYY-MM-DD`, for display and for sending a due date to the client. */
export function formatCalendarDate(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

/**
 * The first year this app holds links for. Nothing predates it, so there is no reason to offer
 * earlier years in a form or a filter.
 */
export const FIRST_YEAR = 2026

/**
 * The years worth offering: from launch up to the current one, and next year as well once
 * December arrives, so January's sheets can be added before the year turns.
 *
 * A link that somehow sits outside this range still needs to be editable, so callers pass its own
 * year through `include`.
 */
export function availableYears(
  now: Date = new Date(),
  timeZone = 'UTC',
  include?: number | null
): number[] {
  const today = calendarDateIn(timeZone, now)
  const latest = today.month === 12 ? today.year + 1 : today.year

  const years = new Set<number>()

  for (let year = FIRST_YEAR; year <= Math.max(FIRST_YEAR, latest); year++) {
    years.add(year)
  }

  if (include) years.add(include)

  return [...years].sort((a, b) => a - b)
}

/**
 * Whether a link has reached its archive date. Compares calendar dates in the app's timezone
 * rather than UTC instants, so a link becomes due at local midnight wherever the server runs.
 */
export function isArchiveDue(
  link: PeriodLike,
  graceDays: number,
  now: Date,
  timeZone: string
): boolean {
  const today = calendarDateIn(timeZone, now)

  return calendarDateKey(today) >= calendarDateKey(archiveDueDate(link, graceDays))
}
