import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'
import { updateUserSchema } from '#shared/schemas/user'
import type { UserDTO } from '#shared/types/user'

export default defineEventHandler(async (event): Promise<UserDTO> => {
  const actor = await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, updateUserSchema.parse)

  /*
   * The whole read-check-write sequence runs in one transaction. Besides keeping the entry with
   * its change, that makes the last-admin guard hold under concurrency: two admins demoting each
   * other at the same moment can no longer both pass the check and leave nobody in charge.
   */
  const updated = await db.transaction(async (tx) => {
    const [target] = await tx
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

      if (!await hasOtherActiveAdmin(target.id, tx)) {
        throw createError({
          statusCode: 409,
          statusMessage: 'This is the last active admin. Promote someone else first.'
        })
      }
    }

    const [row] = await tx
      .update(schema.users)
      .set(body)
      .where(eq(schema.users.id, id))
      .returning(publicUserColumns)

    const changed = changedFields(target, body)

    const notes: string[] = []
    if (changed.includes('role')) notes.push(`role to ${body.role}`)
    if (changed.includes('isActive')) notes.push(body.isActive ? 'reactivated' : 'deactivated')
    if (changed.includes('name')) notes.push(`name to ${body.name}`)

    await recordAudit(tx, auditActor(actor), {
      action: 'user.updated',
      entityType: 'user',
      entityId: id,
      entityLabel: target.name,
      summary: notes.length
        ? `Changed ${target.email}: ${notes.join(', ')}`
        : `Saved ${target.email} with no changes`,
      changedFields: changed
    })

    return row!
  })

  return toUserDTO(updated)
})
