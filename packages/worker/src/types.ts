export interface Env {
  DB: D1Database
  CONFIG_CACHE: KVNamespace
  ENVIRONMENT: string
  PROOF_SECRET: string
}

export interface ConsentRecord {
  id: string
  site_id: string
  visitor_id: string
  categories: string
  ip_truncated: string | null
  user_agent: string | null
  given_at: string
  expires_at: string
  proof_token: string
  widget_version: string
  purge_after: string
}

export interface ConsentPayload {
  visitor_id: string
  site_id: string
  categories: {
    essential: boolean
    analytics: boolean
    marketing: boolean
    functional: boolean
  }
  widget_version: string
}

export interface SiteConfig {
  site_id: string
  domain: string
  categories: Array<{
    key: string
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
