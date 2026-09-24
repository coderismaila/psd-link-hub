import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { createUserSchema } from '#shared/schemas/user'
import type { UserDTO } from '#shared/types/user'

export default defineEventHandler(async (event): Promise<UserDTO> => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, createUserSchema.parse)

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, body.email))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'That email address is already in use' })
  }

  const [created] = await db
    .insert(schema.users)
    .values({
      name: body.name,
      email: body.email,
      role: body.role,
      isActive: true,
      passwordHash: await hashPassword(body.password),
      mustChangePassword: true
    })
    .returning(publicUserColumns)

  setResponseStatus(event, 201)

  return toUserDTO(created!)
})
