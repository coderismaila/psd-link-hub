import { sql } from 'drizzle-orm'
import { schema } from '@nuxthub/db'
import { periodLabel } from '#shared/utils/period'
import type { LinkWithPrefs } from '#shared/types/link'

/**
 * Escapes the wildcards SQLite's LIKE understands, so a search for `100%` looks for that literal
 * text instead of matching everything. Pair with `ESCAPE '\'`.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`)
}

/** Builds a `name LIKE ? OR description LIKE ?` condition for a user's search text. */
export function searchCondition(query: string) {
  const pattern = `%${escapeLikePattern(query)}%`

  return sql`(${schema.links.name} LIKE ${pattern} ESCAPE '\\' OR ${schema.links.description} LIKE ${pattern} ESCAPE '\\')`
}

/** The columns a link DTO needs, plus the category and the caller's own preference columns. */
export const linkWithPrefsColumns = {
  id: schema.links.id,
  name: schema.links.name,
  description: schema.links.description,
  url: schema.links.url,
  categoryId: schema.links.categoryId,
  periodType: schema.links.periodType,
  periodYear: schema.links.periodYear,
  periodMonth: schema.links.periodMonth,
  status: schema.links.status,
  archivedAt: schema.links.archivedAt,
  archivedBy: schema.links.archivedBy,
  createdBy: schema.links.createdBy,
  createdAt: schema.links.createdAt,
  updatedAt: schema.links.updatedAt,
  categoryName: schema.categories.name,
  categoryColor: schema.categories.color,
  isFavorite: schema.userLinkPrefs.isFavorite,
  favoriteOrder: schema.userLinkPrefs.favoriteOrder,
  isPersonallyArchived: schema.userLinkPrefs.isArchived
} as const

/**
 * A row produced by selecting `linkWithPrefsColumns`. The preference columns are nullable because
 * they come from a left join — a user who has never touched a link has no preference row.
 */
export type LinkRow = Omit<typeof schema.links.$inferSelect, 'archivedByUserId'> & {
  categoryName: string
  categoryColor: string
  isFavorite: boolean | null
  favoriteOrder: number | null
  isPersonallyArchived: boolean | null
}

/** Turns a joined row into the DTO the client consumes: ISO dates, nested category, flat prefs. */
export function toLinkWithPrefs(row: LinkRow): LinkWithPrefs {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    url: row.url,
    categoryId: row.categoryId,
    periodType: row.periodType,
    periodYear: row.periodYear,
    periodMonth: row.periodMonth,
    status: row.status,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    archivedBy: row.archivedBy,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    category: { id: row.categoryId, name: row.categoryName, color: row.categoryColor },
    isFavorite: row.isFavorite ?? false,
    favoriteOrder: row.favoriteOrder,
    isPersonallyArchived: row.isPersonallyArchived ?? false,
    periodLabel: periodLabel(row)
  }
}
