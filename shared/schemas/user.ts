import * as z from 'zod'

export const userRoleSchema = z.enum(['admin', 'viewer'])

/** Minimum length for any password an admin sets, on create or on reset. */
export const passwordSchema = z.string()
  .min(8, 'Use at least 8 characters')
  .max(200, 'Use 200 characters or fewer')

const nameSchema = z.string().trim().min(1, 'Name is required').max(120, 'Use 120 characters or fewer')

export const createUserSchema = z.object({
  name: nameSchema,
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  role: userRoleSchema,
  /** A temporary password the admin hands over; there is no self sign-up or invite email. */
  password: passwordSchema
})

/** Email is not editable: it identifies the account. */
export const updateUserSchema = z.object({
  name: nameSchema,
  role: userRoleSchema,
  isActive: z.boolean()
})

export const resetPasswordSchema = z.object({
  password: passwordSchema
})

export type CreateUserBody = z.output<typeof createUserSchema>
export type UpdateUserBody = z.output<typeof updateUserSchema>
