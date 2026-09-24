declare module '#auth-utils' {
  interface User {
    id: number
    name: string
    email: string
    role: 'admin' | 'viewer'
    /** True while the account still holds a password an admin set. */
    mustChangePassword: boolean
  }
}

export {}
