import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const protectedPrefixes = ['/herd']
const authSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
  if (!isProtected) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: authSecret })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/herd/:path*'],
}
