import { db, schema } from '@nuxthub/db'
import { DEFAULT_ARCHIVE_SETTINGS, GRACE_DAYS_MAX, GRACE_DAYS_MIN, type ArchiveSettings } from '#shared/types/settings'

/** Maps each `ArchiveSettings` field to its row key in the `settings` table. */
const KEYS = {
  mode: 'archive.mode',
  graceDays: 'archive.graceDays',
  includeYearly: 'archive.includeYearly',
  lastRunAt: 'archive.lastRunAt'
} as const satisfies Record<keyof ArchiveSettings, string>

type Field = keyof ArchiveSettings

/**
 * Decoders return `undefined` for anything they do not recognise, so a missing row, invalid JSON
 * or an out-of-range value falls back to the default instead of breaking the app.
 */
function parseMode(value: unknown): ArchiveSettings['mode'] | undefined {
  return value === 'auto' || value === 'manual' ? value : undefined
}

function parseGraceDays(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined
  return value >= GRACE_DAYS_MIN && value <= GRACE_DAYS_MAX ? value : undefined
}

function parseIncludeYearly(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function parseLastRunAt(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return undefined
  return value
}

function decode(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * Reads every archive setting, filling in defaults for rows that are missing or invalid. Pass a
 * transaction to read within it.
 */
export async function getSettings(tx: DbExecutor = db): Promise<ArchiveSettings> {
  const rows = await tx.select().from(schema.settings)
  const values = new Map(rows.map(row => [row.key, decode(row.value)]))

  return {
    mode: parseMode(values.get(KEYS.mode)) ?? DEFAULT_ARCHIVE_SETTINGS.mode,
    graceDays: parseGraceDays(values.get(KEYS.graceDays)) ?? DEFAULT_ARCHIVE_SETTINGS.graceDays,
    includeYearly: parseIncludeYearly(values.get(KEYS.includeYearly)) ?? DEFAULT_ARCHIVE_SETTINGS.includeYearly,
    lastRunAt: parseLastRunAt(values.get(KEYS.lastRunAt)) ?? DEFAULT_ARCHIVE_SETTINGS.lastRunAt
  }
}

/**
 * Upserts the given fields and returns the full, merged settings. Pass a transaction to write
 * within it — the settings form does, so a change and its audit entry land together.
 */
export async function updateSettings(
  patch: Partial<ArchiveSettings>,
  tx: DbExecutor = db
): Promise<ArchiveSettings> {
  const updatedAt = new Date()
  const rows = (Object.keys(KEYS) as Field[])
    .filter(field => patch[field] !== undefined)
    .map(field => ({ key: KEYS[field], value: JSON.stringify(patch[field]), updatedAt }))

  for (const row of rows) {
    await tx.insert(schema.settings).values(row).onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: row.value, updatedAt }
    })
  }

  return getSettings(tx)
}
