import type { ConsentCategories, ConsentCallback } from './types'
import { getConsent, setConsent, clearConsent } from './cookie'
import { saveConsent } from './api'

const WIDGET_VERSION = '1.0.0'
const CONSENT_DURATION_MONTHS = 13

export class ConsentManager {
  private readonly siteId: string
  private readonly apiUrl: string
  private readonly visitorId: string
  private readonly listeners: ConsentCallback[] = []

  constructor(siteId: string, apiUrl: string) {
    this.siteId = siteId
    this.apiUrl = apiUrl
    this.visitorId = this.getOrCreateVisitorId()
  }

  private getOrCreateVisitorId(): string {
    const key = `_cmp_vid_${this.siteId}`
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = `v_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    localStorage.setItem(key, id)
    return id
  }

  getCurrentConsent(): ConsentCategories | null {
    const stored = getConsent(this.siteId)
    return stored?.categories ?? null
  }

  hasConsented(): boolean {
    return this.getCurrentConsent() !== null
  }

  async acceptAll(): Promise<void> {
    const categories: ConsentCategories = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true
    }
    await this.applyConsent(categories)
  }

  async rejectAll(): Promise<void> {
    const categories: ConsentCategories = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false
    }
    await this.applyConsent(categories)
  }

  async saveCustom(categories: ConsentCategories): Promise<void> {
    const safeCategories: ConsentCategories = { ...categories, essential: true }
    await this.applyConsent(safeCategories)
  }

  onConsentChange(callback: ConsentCallback): void {
    this.listeners.push(callback)
  }

  private async applyConsent(categories: ConsentCategories): Promise<void> {
    setConsent(this.siteId, categories, CONSENT_DURATION_MONTHS)

    saveConsent(this.apiUrl, this.siteId, this.visitorId, categories, WIDGET_VERSION).catch(() => {
      // Silent fail — local cookie is the source of truth
    })

    for (const listener of this.listeners) {
      listener(categories)
    }
  }

  revokeConsent(): void {
    clearConsent(this.siteId)
    const revoked: ConsentCategories = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false
    }
    for (const listener of this.listeners) {
      listener(revoked)
    }
  }
}
