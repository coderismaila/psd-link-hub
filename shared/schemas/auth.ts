import * as z from 'zod'

/**
 * Login only checks the shape of the input. Any credential problem is answered with the same
 * generic 401 by the server, so this schema deliberately does not enforce the password policy.
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Password is required')
})

export type LoginInput = z.output<typeof loginSchema>
