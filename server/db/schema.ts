import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date())
}

export const users = sqliteTable('users', {
  id: integer().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(), // store lower-cased
  name: text().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text({ enum: ['admin', 'viewer'] }).notNull().default('viewer'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
})

export const categories = sqliteTable('categories', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  color: text().notNull().default('neutral'), // Nuxt UI color token for UBadge
  ...timestamps
})

export const links = sqliteTable('links', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull().default(''),
  url: text().notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  periodType: text('period_type', { enum: ['monthly', 'yearly'] }).notNull(),
  periodYear: integer('period_year').notNull(),
  periodMonth: integer('period_month'), // 1-12 when monthly, null when yearly
  status: text({ enum: ['active', 'archived'] }).notNull().default('active'),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  archivedBy: text('archived_by', { enum: ['system', 'admin'] }),
  archivedByUserId: integer('archived_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps
}, t => [
  index('links_status_idx').on(t.status),
  index('links_category_idx').on(t.categoryId),
  index('links_period_idx').on(t.periodYear, t.periodMonth)
])

export const userLinkPrefs = sqliteTable('user_link_prefs', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkId: integer('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  favoriteOrder: integer('favorite_order'), // gaps allowed; sort ASC NULLS LAST
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date())
}, t => [
  primaryKey({ columns: [t.userId, t.linkId] }),
  index('prefs_user_fav_idx').on(t.userId, t.isFavorite)
])

export const settings = sqliteTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(), // JSON-encoded
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})
