import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  archiveDueDate,
  calendarDateIn,
  calendarDateKey,
  formatCalendarDate,
  isArchiveDue,
  periodLabel,
  type PeriodLike
} from '../shared/utils/period.ts'

const monthly = (year: number, month: number): PeriodLike =>
  ({ periodType: 'monthly', periodYear: year, periodMonth: month })

const yearly = (year: number): PeriodLike =>
  ({ periodType: 'yearly', periodYear: year, periodMonth: null })

describe('periodLabel', () => {
  test('names the month for monthly links', () => {
    assert.equal(periodLabel(monthly(2026, 9)), 'Sep 2026')
    assert.equal(periodLabel(monthly(2026, 1)), 'Jan 2026')
    assert.equal(periodLabel(monthly(2026, 12)), 'Dec 2026')
  })

  test('shows the year alone for yearly links', () => {
    assert.equal(periodLabel(yearly(2026)), '2026')
  })

  test('falls back to the year if a monthly link has no month', () => {
    assert.equal(periodLabel({ periodType: 'monthly', periodYear: 2026, periodMonth: null }), '2026')
  })
})

describe('archiveDueDate', () => {
  test('is the day after the month ends, plus the grace days', () => {
    // The PRD example: September 2026 with 3 grace days is due on 4 Oct 2026.
    assert.deepEqual(archiveDueDate(monthly(2026, 9), 3), { year: 2026, month: 10, day: 4 })
  })

  test('with no grace, falls due on the first of the next month', () => {
    assert.deepEqual(archiveDueDate(monthly(2026, 9), 0), { year: 2026, month: 10, day: 1 })
  })

  test('rolls December into the following January', () => {
    assert.deepEqual(archiveDueDate(monthly(2026, 12), 3), { year: 2027, month: 1, day: 4 })
    assert.deepEqual(archiveDueDate(monthly(2026, 12), 0), { year: 2027, month: 1, day: 1 })
  })

  test('handles months of different lengths', () => {
    assert.deepEqual(archiveDueDate(monthly(2026, 1), 3), { year: 2026, month: 2, day: 4 })
    assert.deepEqual(archiveDueDate(monthly(2026, 2), 0), { year: 2026, month: 3, day: 1 })
    // February in a leap year still ends the same way: the due date is the 1st of March.
    assert.deepEqual(archiveDueDate(monthly(2028, 2), 0), { year: 2028, month: 3, day: 1 })
  })

  test('grace days can push the due date into the next month', () => {
    assert.deepEqual(archiveDueDate(monthly(2026, 9), 31), { year: 2026, month: 11, day: 1 })
  })

  test('yearly links fall due after 31 December', () => {
    assert.deepEqual(archiveDueDate(yearly(2026), 3), { year: 2027, month: 1, day: 4 })
    assert.deepEqual(archiveDueDate(yearly(2026), 0), { year: 2027, month: 1, day: 1 })
  })
})

describe('isArchiveDue', () => {
  test('is false on the last day of the period and true once the grace has passed', () => {
    const link = monthly(2026, 9)

    assert.equal(isArchiveDue(link, 3, new Date('2026-09-30T12:00:00Z'), 'UTC'), false)
    assert.equal(isArchiveDue(link, 3, new Date('2026-10-03T12:00:00Z'), 'UTC'), false)
    assert.equal(isArchiveDue(link, 3, new Date('2026-10-04T00:00:00Z'), 'UTC'), true)
    assert.equal(isArchiveDue(link, 3, new Date('2026-11-01T12:00:00Z'), 'UTC'), true)
  })

  test('with grace 0, falls due the moment the month turns over', () => {
    const link = monthly(2026, 9)

    assert.equal(isArchiveDue(link, 0, new Date('2026-09-30T23:59:59Z'), 'UTC'), false)
    assert.equal(isArchiveDue(link, 0, new Date('2026-10-01T00:00:00Z'), 'UTC'), true)
  })

  test('compares calendar dates in the given timezone, not UTC', () => {
    const link = monthly(2026, 9)
    // 23:00 UTC on 3 Oct is already 13:00 on 4 Oct in Kiritimati (UTC+14) but still the 3rd in UTC.
    const instant = new Date('2026-10-03T23:00:00Z')

    assert.equal(isArchiveDue(link, 3, instant, 'UTC'), false)
    assert.equal(isArchiveDue(link, 3, instant, 'Pacific/Kiritimati'), true)
  })

  test('a timezone behind UTC holds the link back for another day', () => {
    const link = monthly(2026, 9)
    // 05:00 UTC on 4 Oct is still 19:00 on 3 Oct in Honolulu (UTC-10).
    const instant = new Date('2026-10-04T05:00:00Z')

    assert.equal(isArchiveDue(link, 3, instant, 'UTC'), true)
    assert.equal(isArchiveDue(link, 3, instant, 'Pacific/Honolulu'), false)
  })

  test('a December link is not due until the new year', () => {
    const link = monthly(2026, 12)

    assert.equal(isArchiveDue(link, 3, new Date('2026-12-31T23:00:00Z'), 'UTC'), false)
    assert.equal(isArchiveDue(link, 3, new Date('2027-01-03T12:00:00Z'), 'UTC'), false)
    assert.equal(isArchiveDue(link, 3, new Date('2027-01-04T00:00:00Z'), 'UTC'), true)
  })

  test('yearly links are not due until the following January', () => {
    const link = yearly(2026)

    assert.equal(isArchiveDue(link, 3, new Date('2026-12-31T12:00:00Z'), 'UTC'), false)
    assert.equal(isArchiveDue(link, 3, new Date('2027-01-04T12:00:00Z'), 'UTC'), true)
  })
})

describe('calendar date helpers', () => {
  test('reads the local date for a timezone', () => {
    const instant = new Date('2026-10-03T23:00:00Z')

    assert.deepEqual(calendarDateIn('UTC', instant), { year: 2026, month: 10, day: 3 })
    assert.deepEqual(calendarDateIn('Pacific/Kiritimati', instant), { year: 2026, month: 10, day: 4 })
  })

  test('keys sort chronologically', () => {
    assert.ok(calendarDateKey({ year: 2026, month: 10, day: 4 })
      > calendarDateKey({ year: 2026, month: 9, day: 30 }))
    assert.ok(calendarDateKey({ year: 2027, month: 1, day: 1 })
      > calendarDateKey({ year: 2026, month: 12, day: 31 }))
  })

  test('formats with padding', () => {
    assert.equal(formatCalendarDate({ year: 2026, month: 1, day: 4 }), '2026-01-04')
    assert.equal(formatCalendarDate({ year: 2026, month: 10, day: 14 }), '2026-10-14')
  })
})
