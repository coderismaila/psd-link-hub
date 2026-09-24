import { db, schema } from '@nuxthub/db'
import { and, eq, ne } from 'drizzle-orm'
import type { UserDTO } from '#shared/types/user'

/**
 * The only columns any user endpoint selects. Listing them explicitly is what keeps
 * `passwordHash` out of every response.
 */
export const publicUserColumns = {
  id: schema.users.id,
  name: schema.users.name,
  email: schema.users.email,
  role: schema.users.role,
  isActive: schema.users.isActive,
  mustChangePassword: schema.users.mustChangePassword,
  createdAt: schema.users.createdAt,
  updatedAt: schema.users.updatedAt
} as const

type PublicUserRow = Omit<typeof schema.users.$inferSelect, 'passwordHash'>

export function toUserDTO(row: PublicUserRow): UserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Whether any active admin other than `excludeUserId` exists. */
export async function hasOtherActiveAdmin(excludeUserId: number): Promise<boolean> {
  const [other] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(
      eq(schema.users.role, 'admin'),
      eq(schema.users.isActive, true),
      ne(schema.users.id, excludeUserId)
    ))
    .limit(1)

  return Boolean(other)
}
