import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

const SAMPLE_CATEGORIES = [
  { name: 'Daily Logs', color: 'info' },
  { name: 'Monthly Reports', color: 'success' },
  { name: 'Reference', color: 'warning' }
] as const

/** Shifts a (year, month) pair by `delta` months, keeping month in 1-12. */
function shiftMonth(year: number, month: number, delta: number) {
  const zeroBased = year * 12 + (month - 1) + delta
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 }
}

export default defineTask({
  meta: {
    name: 'db:seed',
    description: 'Create the first admin from env plus sample categories and links'
  },
  async run() {
    const config = useRuntimeConfig()
    const created = { admin: false, categories: 0, links: 0 }

    // --- First admin -------------------------------------------------------
    const [existingAdmin] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.role, 'admin'))
      .limit(1)

    let adminId = existingAdmin?.id ?? null

    if (existingAdmin) {
      console.log('[db:seed] An admin already exists, skipping admin creation.')
    } else if (!config.adminEmail || !config.adminPassword) {
      console.warn('[db:seed] NUXT_ADMIN_EMAIL / NUXT_ADMIN_PASSWORD are not set, skipping admin creation.')
    } else {
      const email = config.adminEmail.trim().toLowerCase()
      const [admin] = await db
        .insert(schema.users)
        .values({
          email,
          name: config.adminName || 'Administrator',
          passwordHash: await hashPassword(config.adminPassword),
          role: 'admin',
          isActive: true
        })
        .returning({ id: schema.users.id })

      adminId = admin?.id ?? null
      created.admin = true
      console.log(`[db:seed] Created admin ${email}.`)
    }

    // --- Sample categories -------------------------------------------------
    for (const category of SAMPLE_CATEGORIES) {
      const inserted = await db
        .insert(schema.categories)
        .values({ name: category.name, color: category.color })
        .onConflictDoNothing({ target: schema.categories.name })
        .returning({ id: schema.categories.id })
      created.categories += inserted.length
    }

    const categories = await db.select().from(schema.categories)
    const categoryId = (name: string) => categories.find(c => c.name === name)?.id

    // --- Sample links ------------------------------------------------------
    const [existingLink] = await db.select({ id: schema.links.id }).from(schema.links).limit(1)

    if (existingLink) {
      console.log('[db:seed] Links already exist, skipping sample links.')
    } else {
      const now = new Date()
      const thisMonth = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
      const lastMonth = shiftMonth(thisMonth.year, thisMonth.month, -1)

      const samples = [
        {
          name: `Dispatch Daily Log — ${thisMonth.year}-${String(thisMonth.month).padStart(2, '0')}`,
          description: 'Daily dispatch entries for the current month.',
          url: 'https://docs.google.com/spreadsheets/d/sample-daily-log-current/edit',
          categoryId: categoryId('Daily Logs'),
          periodType: 'monthly' as const,
          periodYear: thisMonth.year,
          periodMonth: thisMonth.month
        },
        {
          name: `Dispatch Daily Log — ${lastMonth.year}-${String(lastMonth.month).padStart(2, '0')}`,
          description: 'Daily dispatch entries for last month.',
          url: 'https://docs.google.com/spreadsheets/d/sample-daily-log-previous/edit',
          categoryId: categoryId('Daily Logs'),
          periodType: 'monthly' as const,
          periodYear: lastMonth.year,
          periodMonth: lastMonth.month
        },
        {
          name: `Fleet Register ${thisMonth.year}`,
          description: 'Vehicles and assignments for the year.',
          url: 'https://docs.google.com/spreadsheets/d/sample-fleet-register/edit',
          categoryId: categoryId('Reference'),
          periodType: 'yearly' as const,
          periodYear: thisMonth.year,
          periodMonth: null
        },
        {
          name: `Annual Summary ${thisMonth.year}`,
          description: 'Rolled-up monthly figures for the year.',
          url: 'https://docs.google.com/spreadsheets/d/sample-annual-summary/edit',
          categoryId: categoryId('Monthly Reports'),
          periodType: 'yearly' as const,
          periodYear: thisMonth.year,
          periodMonth: null
        }
      ]

      for (const sample of samples) {
        if (!sample.categoryId) {
          console.warn(`[db:seed] Skipping "${sample.name}" — its category is missing.`)
          continue
        }
        await db.insert(schema.links).values({ ...sample, categoryId: sample.categoryId, createdBy: adminId })
        created.links += 1
      }
    }

    console.log(`[db:seed] Done. admin=${created.admin} categories=${created.categories} links=${created.links}`)
    return { result: created }
  }
})
