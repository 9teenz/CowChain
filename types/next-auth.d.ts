import NextAuth, { DefaultSession } from 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      emailVerified: boolean
      walletAddress: string | null
      role: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    emailVerified?: boolean
    walletAddress?: string | null
    role?: string
  }
}
