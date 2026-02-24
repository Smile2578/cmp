import { describe, it, expect, beforeEach } from 'vitest'
import { getConsent, setConsent, clearConsent } from '../cookie'

const SITE_ID = 'test_site'

describe('cookie module', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
    })
  })

  it('returns null when no consent cookie exists', () => {
    expect(getConsent(SITE_ID)).toBeNull()
  })

  it('saves and retrieves consent', () => {
    const categories = { essential: true, analytics: true, marketing: false, functional: true }
    setConsent(SITE_ID, categories, 13)
    const result = getConsent(SITE_ID)
    expect(result).not.toBeNull()
    expect(result!.categories).toEqual(categories)
  })

  it('clears consent', () => {
    const categories = { essential: true, analytics: false, marketing: false, functional: false }
    setConsent(SITE_ID, categories, 13)
    expect(getConsent(SITE_ID)).not.toBeNull()
    clearConsent(SITE_ID)
    expect(getConsent(SITE_ID)).toBeNull()
  })

  it('stores expiry date 13 months from now', () => {
    const categories = { essential: true, analytics: true, marketing: true, functional: true }
    setConsent(SITE_ID, categories, 13)
    const result = getConsent(SITE_ID)
    const expiresAt = new Date(result!.expires_at)
    const now = new Date()
    const diffMonths = (expiresAt.getFullYear() - now.getFullYear()) * 12 + (expiresAt.getMonth() - now.getMonth())
    expect(diffMonths).toBe(13)
  })
})
