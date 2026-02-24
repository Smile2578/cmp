import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Widget integration', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
    })
    localStorage.clear()
    ;(globalThis as any).dataLayer = []
    ;(globalThis as any).gtag = vi.fn()
  })

  it('exports CMP.init function', async () => {
    const { init } = await import('../index')
    expect(typeof init).toBe('function')
  })
})
