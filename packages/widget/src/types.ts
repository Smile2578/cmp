export interface ConsentCategories {
  essential: boolean
  analytics: boolean
  marketing: boolean
  functional: boolean
}

export interface ConsentState {
  categories: ConsentCategories
  given_at: string
  expires_at: string
  proof_token: string
}

export interface WidgetConfig {
  siteId: string
  apiUrl: string
  categories: Array<{
    key: keyof ConsentCategories
    label_fr: string
    description_fr: string
    is_essential: boolean
    cookies: Array<{
      name: string
      provider: string
      description_fr: string
      duration: string
    }>
  }>
  theme: {
    position: string
    colors: { primary: string; background: string; text: string }
    texts: Record<string, string>
    logo_url: string | null
  }
}

export type ConsentCallback = (categories: ConsentCategories) => void
