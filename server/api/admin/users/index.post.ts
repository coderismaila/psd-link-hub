import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { createUserSchema } from '#shared/schemas/user'
import type { UserDTO } from '#shared/types/user'

export default defineEventHandler(async (event): Promise<UserDTO> => {
  const actor = await requireAdmin(event)
  const body = await readValidatedBody(event, createUserSchema.parse)

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, body.email))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'That email address is already in use' })
  }

  // Hashed before the transaction opens: scrypt is slow on purpose, and there is no reason to hold
  // a write lock while it runs.
  const passwordHash = await hashPassword(body.password)

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.users)
      .values({
        name: body.name,
        email: body.email,
        role: body.role,
        isActive: true,
        passwordHash,
        mustChangePassword: true
      })
      .returning(publicUserColumns)

    await recordAudit(tx, auditActor(actor), {
      action: 'user.created',
      entityType: 'user',
      entityId: row!.id,
      entityLabel: body.name,
      summary: `Created ${body.role} account for ${body.email}`
    })

    return row!
  })

  setResponseStatus(event, 201)

  return toUserDTO(created)
})
