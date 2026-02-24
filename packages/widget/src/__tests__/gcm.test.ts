import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GoogleConsentMode } from '../gcm'

describe('GoogleConsentMode', () => {
  let gcm: GoogleConsentMode
  let gtagCalls: Array<[string, string, Record<string, string>]>

  beforeEach(() => {
    gtagCalls = []
    ;(globalThis as any).dataLayer = []
    ;(globalThis as any).gtag = (...args: any[]) => { gtagCalls.push(args as any) }
    gcm = new GoogleConsentMode()
  })

  it('sets default denied state', () => {
    gcm.setDefaults()

    expect(gtagCalls).toHaveLength(1)
    expect(gtagCalls[0][0]).toBe('consent')
    expect(gtagCalls[0][1]).toBe('default')
    expect(gtagCalls[0][2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted',
      wait_for_update: 500
    })
  })

  it('updates consent based on categories', () => {
    gcm.updateConsent({
      essential: true,
      analytics: true,
      marketing: false,
      functional: true
    })

    expect(gtagCalls).toHaveLength(1)
    expect(gtagCalls[0][0]).toBe('consent')
    expect(gtagCalls[0][1]).toBe('update')
    expect(gtagCalls[0][2]).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
      functionality_storage: 'granted',
      personalization_storage: 'granted',
      security_storage: 'granted'
    })
  })

  it('grants ad signals when marketing is accepted', () => {
    gcm.updateConsent({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true
    })

    expect(gtagCalls[0][2].ad_storage).toBe('granted')
    expect(gtagCalls[0][2].ad_user_data).toBe('granted')
    expect(gtagCalls[0][2].ad_personalization).toBe('granted')
  })

  it('works without gtag defined (graceful fallback)', () => {
    delete (globalThis as any).gtag
    expect(() => gcm.setDefaults()).not.toThrow()
    expect(() => gcm.updateConsent({ essential: true, analytics: false, marketing: false, functional: false })).not.toThrow()
  })
})
