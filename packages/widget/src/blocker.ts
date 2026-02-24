type ConsentCategory = 'essential' | 'analytics' | 'marketing' | 'functional'

interface BlockedElement {
  original: Element
  category: ConsentCategory
  src: string
  tagName: string
}

export class ScriptBlocker {
  private blockedElements: Map<Element, BlockedElement> = new Map()
  private observer: MutationObserver | null = null
  private activeCategories: Set<ConsentCategory> = new Set(['essential'])

  getBlockedElements(): BlockedElement[] {
    this.scanDocument()
    return Array.from(this.blockedElements.values())
  }

  private scanDocument(): void {
    const scripts = document.querySelectorAll('script[type="text/plain"][data-consent]')
    const iframes = document.querySelectorAll('iframe[data-consent][data-src]')

    for (const el of [...scripts, ...iframes]) {
      if (this.blockedElements.has(el)) continue
      const category = el.getAttribute('data-consent') as ConsentCategory
      const src = el.getAttribute('data-src') ?? ''
      this.blockedElements.set(el, { original: el, category, src, tagName: el.tagName.toLowerCase() })
    }
  }

  activateCategory(category: ConsentCategory): void {
    this.activeCategories.add(category)
    this.scanDocument()

    const toActivate: Array<[Element, BlockedElement]> = []
    for (const [element, info] of this.blockedElements) {
      if (info.category !== category) continue
      toActivate.push([element, info])
    }

    for (const [element, info] of toActivate) {
      if (info.tagName === 'script') {
        const newScript = document.createElement('script')
        newScript.setAttribute('type', 'text/javascript')
        newScript.setAttribute('data-consent', category)
        newScript.setAttribute('data-consent-activated', 'true')
        newScript.setAttribute('src', info.src)
        element.parentNode?.replaceChild(newScript, element)
        this.blockedElements.delete(element)
        this.blockedElements.set(newScript, { ...info, original: newScript })
      } else if (info.tagName === 'iframe') {
        element.setAttribute('src', info.src)
        element.setAttribute('data-consent-activated', 'true')
      }
    }
  }

  deactivateCategory(category: ConsentCategory): void {
    this.activeCategories.delete(category)

    const toReblock: Array<[Element, BlockedElement]> = []
    for (const [element, info] of this.blockedElements) {
      if (info.category !== category) continue
      toReblock.push([element, info])
    }

    for (const [element, info] of toReblock) {
      if (info.tagName === 'script') {
        const blocked = document.createElement('script')
        blocked.type = 'text/plain'
        blocked.setAttribute('data-consent', category)
        blocked.setAttribute('data-src', info.src)
        element.parentNode?.replaceChild(blocked, element)
        this.blockedElements.delete(element)
        this.blockedElements.set(blocked, { ...info, original: blocked })
      } else if (info.tagName === 'iframe') {
        element.setAttribute('src', 'about:blank')
        element.removeAttribute('data-consent-activated')
      }
    }
  }

  startObserving(): void {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          const consent = node.getAttribute('data-consent')
          if (!consent) continue
          const category = consent as ConsentCategory
          if (this.activeCategories.has(category)) {
            this.activateCategory(category)
          }
        }
      }
    })

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })
  }

  stopObserving(): void {
    this.observer?.disconnect()
    this.observer = null
  }

  applyConsent(categories: Record<string, boolean>): void {
    for (const [category, granted] of Object.entries(categories)) {
      if (category === 'essential') continue
      if (granted) {
        this.activateCategory(category as ConsentCategory)
      } else {
        this.deactivateCategory(category as ConsentCategory)
      }
    }
  }
}
