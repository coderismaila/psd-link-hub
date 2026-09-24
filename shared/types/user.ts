/** A user as sent to the client. `passwordHash` is never part of this shape. */
export interface UserDTO {
  id: number
  name: string
  email: string
  role: 'admin' | 'viewer'
  isActive: boolean
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}
