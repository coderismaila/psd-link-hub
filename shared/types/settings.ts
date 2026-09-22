/** Archive behaviour, editable by admins in /admin/settings. Persisted in the `settings` table. */
export interface ArchiveSettings {
  /** `auto`: monthly links archive themselves once due. `manual`: admin archives overdue links. */
  mode: 'auto' | 'manual'
  /** Days after the end of a period before its links become due for archive (0-31). */
  graceDays: number
  /** When true, yearly links are archived `graceDays` after 31 Dec. */
  includeYearly: boolean
  /** ISO timestamp of the last archive run, or null if it has never run. */
  lastRunAt: string | null
}

export const DEFAULT_ARCHIVE_SETTINGS: ArchiveSettings = {
  mode: 'auto',
  graceDays: 3,
  includeYearly: false,
  lastRunAt: null
}

export const GRACE_DAYS_MIN = 0
export const GRACE_DAYS_MAX = 31
