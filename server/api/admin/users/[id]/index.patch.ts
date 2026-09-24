import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'
import { updateUserSchema } from '#shared/schemas/user'
import type { UserDTO } from '#shared/types/user'

export default defineEventHandler(async (event): Promise<UserDTO> => {
  const actor = await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, updateUserSchema.parse)

  const [target] = await db
    .select(publicUserColumns)
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1)

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Renaming an admin is always fine; losing the role or being switched off is what is guarded.
  const losesAdminAccess = target.role === 'admin'
    && target.isActive
    && (body.role !== 'admin' || !body.isActive)

  if (losesAdminAccess) {
    if (target.id === actor.id) {
      throw createError({
        statusCode: 409,
        statusMessage: 'You cannot remove your own admin access. Ask another admin to do it.'
      })
    }

    if (!await hasOtherActiveAdmin(target.id)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'This is the last active admin. Promote someone else first.'
      })
    }
  }

  const [updated] = await db
    .update(schema.users)
    .set(body)
    .where(eq(schema.users.id, id))
    .returning(publicUserColumns)

  const changed = changedFields(target, body)

  const notes: string[] = []
  if (changed.includes('role')) notes.push(`role to ${body.role}`)
  if (changed.includes('isActive')) notes.push(body.isActive ? 'reactivated' : 'deactivated')
  if (changed.includes('name')) notes.push(`name to ${body.name}`)

  await recordAudit(auditActor(actor), {
    action: 'user.updated',
    entityType: 'user',
    entityId: id,
    entityLabel: target.name,
    summary: notes.length
      ? `Changed ${target.email}: ${notes.join(', ')}`
      : `Saved ${target.email} with no changes`,
    changedFields: changed
  })

  return toUserDTO(updated!)
})
