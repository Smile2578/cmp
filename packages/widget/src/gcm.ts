import type { ConsentCategories } from './types'

type ConsentSignal = 'granted' | 'denied'

interface GtagConsentParams {
  ad_storage: ConsentSignal
  ad_user_data: ConsentSignal
  ad_personalization: ConsentSignal
  analytics_storage: ConsentSignal
  functionality_storage: ConsentSignal
  personalization_storage: ConsentSignal
  security_storage: ConsentSignal
  wait_for_update?: number
}

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

function getGtag(): ((...args: unknown[]) => void) | null {
  if (typeof globalThis !== 'undefined' && 'gtag' in globalThis) {
    return (globalThis as any).gtag
  }
  return null
}

export class GoogleConsentMode {
  setDefaults(): void {
    const gtag = getGtag()
    if (!gtag) return

    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted',
      wait_for_update: 500
    } satisfies GtagConsentParams)
  }

  updateConsent(categories: ConsentCategories): void {
    const gtag = getGtag()
    if (!gtag) return

    const signal = (granted: boolean): ConsentSignal => granted ? 'granted' : 'denied'

    gtag('consent', 'update', {
      ad_storage: signal(categories.marketing),
      ad_user_data: signal(categories.marketing),
      ad_personalization: signal(categories.marketing),
      analytics_storage: signal(categories.analytics),
      functionality_storage: signal(categories.functional),
      personalization_storage: signal(categories.functional),
      security_storage: 'granted'
    } satisfies GtagConsentParams)
  }
}
