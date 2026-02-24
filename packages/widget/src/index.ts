import { ConsentManager } from './consent-manager'
import { ScriptBlocker } from './blocker'
import { GoogleConsentMode } from './gcm'
import { mountWidget, unmountWidget, hideWidget, showWidget } from './ui/mount'
import type { ConsentCategories, WidgetConfig } from './types'

const DEFAULT_API_URL = 'https://cmp-api.workers.dev'

const DEFAULT_CATEGORIES: WidgetConfig['categories'] = [
  {
    key: 'essential',
    label_fr: 'Essentiels',
    description_fr: 'Nécessaires au fonctionnement du site. Toujours actifs.',
    is_essential: true,
    cookies: []
  },
  {
    key: 'analytics',
    label_fr: 'Analytics',
    description_fr: "Mesure d'audience et statistiques de visite.",
    is_essential: false,
    cookies: []
  },
  {
    key: 'marketing',
    label_fr: 'Marketing',
    description_fr: 'Publicité ciblée et suivi des conversions.',
    is_essential: false,
    cookies: []
  },
  {
    key: 'functional',
    label_fr: 'Fonctionnels',
    description_fr: 'Vidéos intégrées, chat en ligne, fonctions avancées.',
    is_essential: false,
    cookies: []
  }
]

const DEFAULT_THEME: WidgetConfig['theme'] = {
  position: 'bottom',
  colors: { primary: '#1a1a1a', background: '#ffffff', text: '#333333' },
  texts: {},
  logo_url: null
}

const REVOKED_CATEGORIES: ConsentCategories = {
  essential: true,
  analytics: false,
  marketing: false,
  functional: false
}

const ALL_ACCEPTED_CATEGORIES: ConsentCategories = {
  essential: true,
  analytics: true,
  marketing: true,
  functional: true
}

interface CMPInstance {
  show: () => void
  hide: () => void
  revoke: () => void
  getConsent: () => ConsentCategories | null
}

function createNoopInstance(): CMPInstance {
  return { show: () => {}, hide: () => {}, revoke: () => {}, getConsent: () => null }
}

function handleConsentApplied(
  gcm: GoogleConsentMode,
  blocker: ScriptBlocker,
  categories: ConsentCategories
): void {
  gcm.updateConsent(categories)
  blocker.applyConsent(categories)
  blocker.startObserving()
  hideWidget()
}

function createInstance(
  manager: ConsentManager,
  gcm: GoogleConsentMode,
  blocker: ScriptBlocker,
  showBanner: boolean
): CMPInstance {
  return {
    show: () => showWidget(),
    hide: () => hideWidget(),
    revoke: () => {
      manager.revokeConsent()
      gcm.updateConsent(REVOKED_CATEGORIES)
      blocker.applyConsent(REVOKED_CATEGORIES)
      if (showBanner) showWidget()
    },
    getConsent: () => manager.getCurrentConsent()
  }
}

export function init(options?: { siteId?: string; apiUrl?: string }): CMPInstance {
  const script = document.currentScript ?? document.querySelector('script[data-site]')
  const siteId = options?.siteId ?? script?.getAttribute('data-site') ?? ''
  const apiUrl = options?.apiUrl ?? script?.getAttribute('data-api') ?? DEFAULT_API_URL

  if (!siteId) {
    return createNoopInstance()
  }

  const gcm = new GoogleConsentMode()
  gcm.setDefaults()

  const manager = new ConsentManager(siteId, apiUrl)
  const blocker = new ScriptBlocker()

  const existingConsent = manager.getCurrentConsent()

  if (existingConsent) {
    gcm.updateConsent(existingConsent)
    blocker.applyConsent(existingConsent)
    blocker.startObserving()
    return createInstance(manager, gcm, blocker, false)
  }

  mountWidget({
    onAcceptAll: () => {
      manager.acceptAll().then(() => {
        handleConsentApplied(gcm, blocker, ALL_ACCEPTED_CATEGORIES)
      })
    },
    onRejectAll: () => {
      manager.rejectAll().then(() => {
        handleConsentApplied(gcm, blocker, REVOKED_CATEGORIES)
      })
    },
    onSaveCustom: (categories) => {
      manager.saveCustom(categories).then(() => {
        handleConsentApplied(gcm, blocker, categories)
      })
    },
    categories: DEFAULT_CATEGORIES,
    theme: DEFAULT_THEME
  })

  return createInstance(manager, gcm, blocker, true)
}

// Auto-init when script loads with data-site attribute
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init())
  } else {
    init()
  }
}
