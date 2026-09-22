import * as z from 'zod'

export const periodTypeSchema = z.enum(['monthly', 'yearly'])

/** Query strings arrive as text, and a cleared filter arrives as `''` rather than being absent. */
function blankToUndefined(value: unknown) {
  return value === '' || value === null ? undefined : value
}

export const linkFiltersSchema = z.object({
  q: z.preprocess(blankToUndefined, z.string().trim().min(1).max(120).optional()),
  categoryId: z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional()),
  periodType: z.preprocess(blankToUndefined, periodTypeSchema.optional()),
  year: z.preprocess(blankToUndefined, z.coerce.number().int().min(2000).max(2100).optional()),
  month: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(12).optional())
})

export type LinkFilters = z.output<typeof linkFiltersSchema>

export const idParamSchema = z.coerce.number().int().positive()

/** `new URL` accepts anything with a scheme, so the protocol is checked separately. */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * The create and edit form body. Both POST and PATCH take the whole object, because the form
 * always submits every field.
 */
export const linkBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Use 120 characters or fewer'),
  description: z.string().trim().max(500, 'Use 500 characters or fewer').default(''),
  url: z.string().trim().min(1, 'URL is required').refine(isHttpsUrl, 'Enter a valid https:// URL'),
  categoryId: z.number({ message: 'Choose a category' }).int().positive('Choose a category'),
  periodType: periodTypeSchema,
  periodYear: z.number({ message: 'Choose a year' }).int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12).nullable().default(null)
})
  .superRefine((value, ctx) => {
    if (value.periodType === 'monthly' && !value.periodMonth) {
      ctx.addIssue({ code: 'custom', path: ['periodMonth'], message: 'Choose a month' })
    }
  })
  // A yearly link has no month, whatever the form happened to be holding when the type changed.
  .transform(value => ({
    ...value,
    periodMonth: value.periodType === 'yearly' ? null : value.periodMonth
  }))

export type LinkBody = z.output<typeof linkBodySchema>
export type LinkBodyInput = z.input<typeof linkBodySchema>

/** Google Sheets links are the norm here, so anything else is worth a nudge — but not a block. */
export function isGoogleSheetsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.hostname === 'docs.google.com' && url.pathname.startsWith('/spreadsheets')
  } catch {
    return false
  }
}

/** The period that follows the given one, used by "Duplicate for next period". */
export function nextPeriod(period: { periodType: 'monthly' | 'yearly', periodYear: number, periodMonth: number | null }) {
  if (period.periodType === 'yearly' || !period.periodMonth) {
    return { periodYear: period.periodYear + 1, periodMonth: null }
  }

  return period.periodMonth === 12
    ? { periodYear: period.periodYear + 1, periodMonth: 1 }
    : { periodYear: period.periodYear, periodMonth: period.periodMonth + 1 }
}
