import * as z from 'zod'

export const linkIdSchema = z.coerce.number().int().positive()

export const favoriteBodySchema = z.object({
  favorite: z.boolean()
})

export const favoriteOrderBodySchema = z.object({
  /** The favorites in their new order. Ids the caller has not favorited are ignored server-side. */
  linkIds: z.array(z.number().int().positive())
    .max(500, 'Too many favorites to reorder at once')
    .refine(ids => new Set(ids).size === ids.length, 'Duplicate link ids')
})

export type FavoriteBody = z.output<typeof favoriteBodySchema>
export type FavoriteOrderBody = z.output<typeof favoriteOrderBodySchema>
