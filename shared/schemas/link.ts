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
