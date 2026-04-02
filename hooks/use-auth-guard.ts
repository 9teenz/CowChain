'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function useAuthGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const { status } = useSession()

  const requireAuth = (action: () => void) => {
    if (status === 'authenticated') {
      action()
      return
    }

    const loginPath = `/login?next=${encodeURIComponent(pathname || '/')}`
    router.push(loginPath)
  }

  return {
    isAuthenticated: status === 'authenticated',
    requireAuth,
  }
}
