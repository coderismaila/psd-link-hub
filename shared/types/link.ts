export interface CategoryDTO {
  id: number
  name: string
  /** Nuxt UI color token used by UBadge. */
  color: string
}

export interface CategoryWithCount extends CategoryDTO {
  /** Links in this category, including archived ones — a category in use cannot be deleted. */
  linkCount: number
}

/** A link as sent to the client. Dates are ISO strings, never `Date` objects. */
export interface LinkDTO {
  id: number
  name: string
  description: string
  url: string
  categoryId: number
  periodType: 'monthly' | 'yearly'
  periodYear: number
  periodMonth: number | null
  status: 'active' | 'archived'
  archivedAt: string | null
  archivedBy: 'system' | 'admin' | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
}

/** A link joined with its category and with the calling user's own preferences. */
export interface LinkWithPrefs extends LinkDTO {
  category: CategoryDTO
  isQuickAccess: boolean
  quickAccessOrder: number | null
  isPersonallyArchived: boolean
  periodLabel: string
}
