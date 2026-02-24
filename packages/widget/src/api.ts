import type { ConsentCategories, WidgetConfig } from './types'

export async function fetchConfig(apiUrl: string, siteId: string): Promise<WidgetConfig | null> {
  try {
    const response = await fetch(`${apiUrl}/api/config/${siteId}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function saveConsent(
  apiUrl: string,
  siteId: string,
  visitorId: string,
  categories: ConsentCategories,
  widgetVersion: string
): Promise<{ id: string; proof_token: string; expires_at: string } | null> {
  try {
    const response = await fetch(`${apiUrl}/api/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId, site_id: siteId, categories, widget_version: widgetVersion })
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}
