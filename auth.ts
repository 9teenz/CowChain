import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'

const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const walletSchema = z.object({
  walletAddress: z.string().min(8),
  walletProvider: z.string().min(2).optional(),
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: authSecret,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHub({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) {
          return null
        }

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
        if (!user?.passwordHash) {
          return null
        }

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash)
        if (!isValid || !user.emailVerified) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
    Credentials({
      id: 'wallet',
      name: 'Wallet',
      credentials: {
        walletAddress: { label: 'Wallet Address', type: 'text' },
        walletProvider: { label: 'Wallet Provider', type: 'text' },
      },
      async authorize(raw) {
        const parsed = walletSchema.safeParse(raw)
        if (!parsed.success) {
          return null
        }

        let user = await prisma.user.findUnique({ where: { walletAddress: parsed.data.walletAddress } })

        if (!user) {
          user = await prisma.user.create({
            data: {
              walletAddress: parsed.data.walletAddress,
              walletProvider: parsed.data.walletProvider || null,
              name: parsed.data.walletProvider ? `${parsed.data.walletProvider} wallet user` : 'Wallet user',
            },
          })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub } })
        token.emailVerified = !!dbUser?.emailVerified
        token.walletAddress = dbUser?.walletAddress || null
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.emailVerified = !!token.emailVerified
        session.user.walletAddress = (token.walletAddress as string | null) || null
      }
      return session
    },
  },
}
