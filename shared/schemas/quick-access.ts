import * as z from 'zod'

export const linkIdSchema = z.coerce.number().int().positive()

export const quickAccessBodySchema = z.object({
  pinned: z.boolean()
})

export const quickAccessOrderBodySchema = z.object({
  /** The quick-access links in their new order. Ids the caller has not pinned are ignored server-side. */
  linkIds: z.array(z.number().int().positive())
    .max(500, 'Too many items to reorder at once')
    .refine(ids => new Set(ids).size === ids.length, 'Duplicate link ids')
})

export type QuickAccessBody = z.output<typeof quickAccessBodySchema>
export type QuickAccessOrderBody = z.output<typeof quickAccessOrderBodySchema>
