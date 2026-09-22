import * as z from 'zod'

/** The Nuxt UI colour tokens a category badge can use. */
export const CATEGORY_COLORS = [
  'primary',
  'secondary',
  'success',
  'info',
  'warning',
  'error',
  'neutral'
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

export const categoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Use 60 characters or fewer'),
  color: z.enum(CATEGORY_COLORS)
})

export type CategoryBody = z.output<typeof categoryBodySchema>
