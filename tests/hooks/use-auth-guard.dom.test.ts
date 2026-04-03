// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let statusMock: 'authenticated' | 'unauthenticated' | 'loading' = 'unauthenticated'
let pathnameMock = '/portfolio'
const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => pathnameMock,
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: statusMock }),
}))

import { useAuthGuard } from '@/hooks/use-auth-guard'

describe('useAuthGuard', () => {
  beforeEach(() => {
    pushMock.mockReset()
    statusMock = 'unauthenticated'
    pathnameMock = '/portfolio'
  })

  it('runs protected action when authenticated', () => {
    statusMock = 'authenticated'
    const action = vi.fn()

    const { result } = renderHook(() => useAuthGuard())
    result.current.requireAuth(action)

    expect(action).toHaveBeenCalledOnce()
    expect(pushMock).not.toHaveBeenCalled()
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('redirects to login with encoded next path when unauthenticated', () => {
    pathnameMock = '/herd/alpine-meadow?tab=details'
    const action = vi.fn()

    const { result } = renderHook(() => useAuthGuard())
    result.current.requireAuth(action)

    expect(action).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/login?next=%2Fherd%2Falpine-meadow%3Ftab%3Ddetails')
    expect(result.current.isAuthenticated).toBe(false)
  })
})
