import { db, schema } from '@nuxthub/db'
import { asc } from 'drizzle-orm'
import type { UserDTO } from '#shared/types/user'

export default defineEventHandler(async (event): Promise<UserDTO[]> => {
  await requireAdmin(event)

  const rows = await db
    .select(publicUserColumns)
    .from(schema.users)
    .orderBy(asc(schema.users.name))

  return rows.map(toUserDTO)
})
