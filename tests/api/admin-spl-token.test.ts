import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createManagedTokenMock,
  disableMintAuthorityMock,
  getServerSessionMock,
  getTokenAdminSummaryMock,
  inspectTokenMintMock,
  mintExistingTokenMock,
} = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  getTokenAdminSummaryMock: vi.fn(),
  createManagedTokenMock: vi.fn(),
  mintExistingTokenMock: vi.fn(),
  inspectTokenMintMock: vi.fn(),
  disableMintAuthorityMock: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/spl-token-admin', () => ({
  getTokenAdminSummary: getTokenAdminSummaryMock,
  createManagedToken: createManagedTokenMock,
  mintExistingToken: mintExistingTokenMock,
  inspectTokenMint: inspectTokenMintMock,
  disableMintAuthority: disableMintAuthorityMock,
}))

import { GET, POST } from '@/app/api/admin/spl-token/route'

describe('admin spl-token route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when the user is not authenticated', async () => {
    getServerSessionMock.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost/api/admin/spl-token'))

    expect(response.status).toBe(401)
  })

  it('returns 403 for non-admin and non-farmer roles', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1', role: 'investor', email: 'user@example.com' } })

    const request = new Request('http://localhost/api/admin/spl-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: 'MilkChain', symbol: 'MILK', decimals: 6 }),
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
  })

  it('returns token admin summary for an allowed role', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1', role: 'farmer', email: 'issuer@example.com' } })
    getTokenAdminSummaryMock.mockReturnValue({
      configured: true,
      cluster: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      adminPublicKey: 'Admin111111111111111111111111111111111',
    })

    const response = await GET(new Request('http://localhost/api/admin/spl-token?cluster=devnet'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(getTokenAdminSummaryMock).toHaveBeenCalledWith('devnet')
  })

  it('creates a token mint when payload is valid', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1', role: 'farmer', email: 'issuer@example.com' } })
    createManagedTokenMock.mockResolvedValue({ mintAddress: 'Mint111111111111111111111111111111111111' })

    const request = new Request('http://localhost/api/admin/spl-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        name: 'MilkChain',
        symbol: 'MILK',
        decimals: 6,
        initialSupply: '1000',
        cluster: 'devnet',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(createManagedTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create',
        name: 'MilkChain',
        symbol: 'MILK',
        decimals: 6,
      })
    )
  })

  it('inspects a mint when mint query is provided', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1', role: 'admin', email: 'admin@example.com' } })
    inspectTokenMintMock.mockResolvedValue({ mintAddress: 'Mint111', supply: '1000' })

    const response = await GET(new Request('http://localhost/api/admin/spl-token?mint=Mint111&cluster=devnet'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(inspectTokenMintMock).toHaveBeenCalledWith({
      mintAddress: 'Mint111',
      holderAddress: undefined,
      cluster: 'devnet',
    })
  })
})
