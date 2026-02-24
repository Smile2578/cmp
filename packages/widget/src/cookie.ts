import type { ConsentCategories } from './types'

interface StoredConsent {
  categories: ConsentCategories
  given_at: string
  expires_at: string
}

const COOKIE_PREFIX = '_consent_'

export function getConsent(siteId: string): StoredConsent | null {
  const name = `${COOKIE_PREFIX}${siteId}`
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  if (!match) return null

  try {
    const data: StoredConsent = JSON.parse(decodeURIComponent(match[1]))
    const expires = new Date(data.expires_at)
    if (expires <= new Date()) return null
    return data
  } catch {
    return null
  }
}

export function setConsent(siteId: string, categories: ConsentCategories, months: number): StoredConsent {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + months)

  const data: StoredConsent = {
    categories,
    given_at: now.toISOString(),
    expires_at: expiresAt.toISOString()
  }

  const name = `${COOKIE_PREFIX}${siteId}`
  const value = encodeURIComponent(JSON.stringify(data))
  document.cookie = `${name}=${value};path=/;max-age=${months * 30 * 24 * 60 * 60};SameSite=Lax`

  return data
}

export function clearConsent(siteId: string): void {
  const name = `${COOKIE_PREFIX}${siteId}`
  document.cookie = `${name}=;path=/;max-age=0`
}
