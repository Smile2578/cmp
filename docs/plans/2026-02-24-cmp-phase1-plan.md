# CMP Phase 1 — Widget MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a working consent widget with edge API + consent storage, deployed on cveuro.com and anaba.io.

**Architecture:** Vanilla TypeScript widget (~15KB gzip) in Shadow DOM, served via Cloudflare CDN. Hono API on Cloudflare Workers handles config and consent storage in D1. Google Consent Mode v2 integrated.

**Tech Stack:** TypeScript, Rollup, Hono, Cloudflare Workers/D1/KV, Vitest, Playwright

---

## Task 1: Monorepo Setup

**Files:**
- Create: `packages/widget/package.json`
- Create: `packages/widget/tsconfig.json`
- Create: `packages/widget/rollup.config.mjs`
- Create: `packages/worker/package.json`
- Create: `packages/worker/tsconfig.json`
- Create: `packages/worker/wrangler.toml`
- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `.gitignore`

**Step 1: Initialize git repo**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp
git init
```

**Step 2: Create root package.json**

```json
{
  "name": "cmp",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:worker": "cd packages/worker && npm run dev",
    "dev:widget": "cd packages/widget && npm run dev",
    "build:worker": "cd packages/worker && npm run build",
    "build:widget": "cd packages/widget && npm run build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
.wrangler/
.dev.vars
*.local
.DS_Store
```

**Step 4: Create packages/worker/package.json**

```json
{
  "name": "@cmp/worker",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "nanoid": "^5.1.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250214.0",
    "wrangler": "^4.0.0",
    "@cloudflare/vitest-pool-workers": "^0.8.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 5: Create packages/worker/wrangler.toml**

```toml
name = "cmp-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
binding = "DB"
database_name = "cmp-consents-dev"
database_id = "local"

[[kv_namespaces]]
binding = "CONFIG_CACHE"
id = "local"
```

**Step 6: Create packages/worker/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 7: Create packages/widget/package.json**

```json
{
  "name": "@cmp/widget",
  "private": true,
  "scripts": {
    "dev": "rollup -c -w",
    "build": "rollup -c --environment BUILD:production",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "rollup": "^4.31.0",
    "@rollup/plugin-typescript": "^12.1.0",
    "@rollup/plugin-terser": "^0.4.4",
    "@rollup/plugin-node-resolve": "^16.0.0",
    "tslib": "^2.8.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "jsdom": "^26.0.0"
  }
}
```

**Step 8: Create packages/widget/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationDir": "./dist/types"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 9: Create packages/widget/rollup.config.mjs**

```javascript
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import resolve from '@rollup/plugin-node-resolve'

const production = process.env.BUILD === 'production'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/consent.js',
    format: 'iife',
    name: 'CMP',
    sourcemap: !production
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json', noEmit: false, declaration: false, outDir: 'dist' }),
    production && terser({
      compress: { passes: 2, drop_console: true },
      mangle: true
    })
  ]
}
```

**Step 10: Install dependencies**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp && npm install
```

**Step 11: Commit**

```bash
git add -A
git commit -m "chore: init monorepo with widget + worker packages"
```

---

## Task 2: D1 Schema + Worker API Skeleton

**Files:**
- Create: `packages/worker/src/index.ts`
- Create: `packages/worker/src/routes/config.ts`
- Create: `packages/worker/src/routes/consent.ts`
- Create: `packages/worker/src/db/schema.sql`
- Create: `packages/worker/src/types.ts`
- Test: `packages/worker/src/__tests__/consent.test.ts`
- Test: `packages/worker/src/__tests__/config.test.ts`

**Step 1: Create types**

Create `packages/worker/src/types.ts`:

```typescript
export interface Env {
  DB: D1Database
  CONFIG_CACHE: KVNamespace
  ENVIRONMENT: string
  PROOF_SECRET: string
}

export interface ConsentRecord {
  id: string
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
```

**Step 2: Create D1 schema**

Create `packages/worker/src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  categories TEXT NOT NULL,
  ip_truncated TEXT,
  user_agent TEXT,
  given_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  proof_token TEXT NOT NULL,
  widget_version TEXT NOT NULL,
  purge_after TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consents_visitor ON consents(visitor_id);
CREATE INDEX IF NOT EXISTS idx_consents_purge ON consents(purge_after);
```

**Step 3: Write failing tests for consent API**

Create `packages/worker/src/__tests__/consent.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import app from '../index'

describe('POST /api/consent', () => {
  it('saves a consent record and returns 201', async () => {
    const payload = {
      visitor_id: 'v_test123',
      categories: {
        essential: true,
        analytics: true,
        marketing: false,
        functional: true
      },
      widget_version: '1.0.0'
    }

    const request = new Request('http://localhost/api/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.42',
        'User-Agent': 'TestBrowser/1.0'
      },
      body: JSON.stringify(payload)
    })

    const ctx = createExecutionContext()
    const response = await app.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(201)
    const body = await response.json() as { id: string; proof_token: string; expires_at: string }
    expect(body.id).toBeTruthy()
    expect(body.proof_token).toBeTruthy()
    expect(body.expires_at).toBeTruthy()
  })

  it('returns 400 for missing visitor_id', async () => {
    const request = new Request('http://localhost/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: { essential: true } })
    })

    const ctx = createExecutionContext()
    const response = await app.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(400)
  })

  it('truncates IP address to /24', async () => {
    const payload = {
      visitor_id: 'v_iptest',
      categories: { essential: true, analytics: false, marketing: false, functional: false },
      widget_version: '1.0.0'
    }

    const request = new Request('http://localhost/api/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.42'
      },
      body: JSON.stringify(payload)
    })

    const ctx = createExecutionContext()
    const response = await app.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(201)

    // Verify IP was truncated
    const result = await env.DB.prepare(
      'SELECT ip_truncated FROM consents WHERE visitor_id = ?'
    ).bind('v_iptest').first()

    expect(result?.ip_truncated).toBe('203.0.113.0/24')
  })
})

describe('GET /api/consent/:visitorId', () => {
  it('returns the latest consent for a visitor', async () => {
    // First save a consent
    const payload = {
      visitor_id: 'v_lookup',
      categories: { essential: true, analytics: true, marketing: false, functional: false },
      widget_version: '1.0.0'
    }

    const postReq = new Request('http://localhost/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const ctx1 = createExecutionContext()
    await app.fetch(postReq, env, ctx1)
    await waitOnExecutionContext(ctx1)

    // Then look it up
    const getReq = new Request('http://localhost/api/consent/v_lookup')
    const ctx2 = createExecutionContext()
    const response = await app.fetch(getReq, env, ctx2)
    await waitOnExecutionContext(ctx2)

    expect(response.status).toBe(200)
    const body = await response.json() as { categories: Record<string, boolean>; expires_at: string }
    expect(body.categories).toEqual({
      essential: true,
      analytics: true,
      marketing: false,
      functional: false
    })
  })

  it('returns 404 for unknown visitor', async () => {
    const request = new Request('http://localhost/api/consent/v_nonexistent')
    const ctx = createExecutionContext()
    const response = await app.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(404)
  })
})
```

**Step 4: Run tests — verify they fail**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/worker && npm test
```

Expected: FAIL — `../index` module does not exist yet.

**Step 5: Implement consent route**

Create `packages/worker/src/routes/consent.ts`:

```typescript
import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import type { Env, ConsentPayload } from '../types'

const consent = new Hono<{ Bindings: Env }>()

function truncateIp(ip: string | null): string | null {
  if (!ip) return null
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
}

function addMonths(date: Date, months: number): string {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result.toISOString()
}

async function generateProofToken(
  visitorId: string,
  categories: string,
  givenAt: string,
  secret: string
): Promise<string> {
  const data = `${visitorId}:${categories}:${givenAt}:${secret}`
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

consent.post('/', async (c) => {
  const body = await c.req.json<ConsentPayload>().catch(() => null)

  if (!body?.visitor_id || !body?.categories || !body?.widget_version) {
    return c.json({ error: 'Missing required fields: visitor_id, categories, widget_version' }, 400)
  }

  const id = nanoid()
  const givenAt = new Date().toISOString()
  const expiresAt = addMonths(new Date(), 13)
  const purgeAfter = addMonths(new Date(), 25)
  const categoriesJson = JSON.stringify(body.categories)
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? null
  const userAgent = c.req.header('User-Agent') ?? null
  const secret = c.env.PROOF_SECRET ?? 'dev-secret'

  const proofToken = await generateProofToken(body.visitor_id, categoriesJson, givenAt, secret)

  await c.env.DB.prepare(`
    INSERT INTO consents (id, visitor_id, categories, ip_truncated, user_agent, given_at, expires_at, proof_token, widget_version, purge_after)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.visitor_id,
    categoriesJson,
    truncateIp(ip),
    userAgent,
    givenAt,
    expiresAt,
    proofToken,
    body.widget_version,
    purgeAfter
  ).run()

  return c.json({ id, proof_token: proofToken, expires_at: expiresAt }, 201)
})

consent.get('/:visitorId', async (c) => {
  const visitorId = c.req.param('visitorId')

  const result = await c.env.DB.prepare(
    'SELECT categories, given_at, expires_at, proof_token FROM consents WHERE visitor_id = ? ORDER BY given_at DESC LIMIT 1'
  ).bind(visitorId).first()

  if (!result) {
    return c.json({ error: 'No consent found' }, 404)
  }

  return c.json({
    categories: JSON.parse(result.categories as string),
    given_at: result.given_at,
    expires_at: result.expires_at,
    proof_token: result.proof_token
  })
})

export { consent }
```

**Step 6: Implement config route**

Create `packages/worker/src/routes/config.ts`:

```typescript
import { Hono } from 'hono'
import type { Env, SiteConfig } from '../types'

const config = new Hono<{ Bindings: Env }>()

config.get('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')

  // Check KV cache first
  const cached = await c.env.CONFIG_CACHE.get(`config:${siteId}`, 'json')
  if (cached) {
    return c.json(cached)
  }

  // For Phase 1 (dogfood), configs are stored in KV directly
  // In Phase 2, this will fetch from Supabase and cache in KV
  return c.json({ error: 'Site not found' }, 404)
})

export { config }
```

**Step 7: Create main Hono app**

Create `packages/worker/src/index.ts`:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { consent } from './routes/consent'
import { config } from './routes/config'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400
}))

app.route('/api/consent', consent)
app.route('/api/config', config)

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

**Step 8: Create vitest config for worker**

Create `packages/worker/vitest.config.ts`:

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          d1Databases: {
            DB: {
              id: 'test-db'
            }
          },
          kvNamespaces: {
            CONFIG_CACHE: {
              id: 'test-kv'
            }
          },
          bindings: {
            PROOF_SECRET: 'test-secret'
          }
        }
      }
    }
  }
})
```

Create `packages/worker/src/__tests__/setup.ts`:

```typescript
import { env } from 'cloudflare:test'

// Run D1 migration before tests
const schema = `
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  categories TEXT NOT NULL,
  ip_truncated TEXT,
  user_agent TEXT,
  given_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  proof_token TEXT NOT NULL,
  widget_version TEXT NOT NULL,
  purge_after TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_consents_visitor ON consents(visitor_id);
CREATE INDEX IF NOT EXISTS idx_consents_purge ON consents(purge_after);
`

export async function setup() {
  for (const statement of schema.split(';').filter(s => s.trim())) {
    await env.DB.exec(statement)
  }
}
```

**Step 9: Run tests — verify they pass**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/worker && npm test
```

Expected: PASS (all 5 tests)

**Step 10: Commit**

```bash
git add packages/worker/
git commit -m "feat: add consent API with D1 storage and KV config cache"
```

---

## Task 3: Widget Core — Consent State Engine

**Files:**
- Create: `packages/widget/src/types.ts`
- Create: `packages/widget/src/cookie.ts`
- Create: `packages/widget/src/api.ts`
- Create: `packages/widget/src/consent-manager.ts`
- Test: `packages/widget/src/__tests__/cookie.test.ts`
- Test: `packages/widget/src/__tests__/consent-manager.test.ts`

**Step 1: Create vitest config for widget**

Create `packages/widget/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom'
  }
})
```

**Step 2: Create widget types**

Create `packages/widget/src/types.ts`:

```typescript
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
```

**Step 3: Write failing tests for cookie module**

Create `packages/widget/src/__tests__/cookie.test.ts`:

```typescript
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
```

**Step 4: Run tests — verify they fail**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm test
```

Expected: FAIL — module `../cookie` does not exist.

**Step 5: Implement cookie module**

Create `packages/widget/src/cookie.ts`:

```typescript
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
```

**Step 6: Run tests — verify they pass**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm test
```

Expected: PASS (all 4 tests)

**Step 7: Implement API client**

Create `packages/widget/src/api.ts`:

```typescript
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
  visitorId: string,
  categories: ConsentCategories,
  widgetVersion: string
): Promise<{ id: string; proof_token: string; expires_at: string } | null> {
  try {
    const response = await fetch(`${apiUrl}/api/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId, categories, widget_version: widgetVersion })
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}
```

**Step 8: Implement consent manager**

Create `packages/widget/src/consent-manager.ts`:

```typescript
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
    const safeCategories = { ...categories, essential: true }
    await this.applyConsent(safeCategories)
  }

  onConsentChange(callback: ConsentCallback): void {
    this.listeners.push(callback)
  }

  private async applyConsent(categories: ConsentCategories): Promise<void> {
    setConsent(this.siteId, categories, CONSENT_DURATION_MONTHS)

    // Fire-and-forget API save (consent is already stored locally)
    saveConsent(this.apiUrl, this.visitorId, categories, WIDGET_VERSION).catch(() => {
      // Silent fail — local cookie is the source of truth for the visitor
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
```

**Step 9: Commit**

```bash
git add packages/widget/
git commit -m "feat: add consent state engine with cookie storage and API client"
```

---

## Task 4: Script Blocker

**Files:**
- Create: `packages/widget/src/blocker.ts`
- Test: `packages/widget/src/__tests__/blocker.test.ts`

**Step 1: Write failing tests**

Create `packages/widget/src/__tests__/blocker.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ScriptBlocker } from '../blocker'

describe('ScriptBlocker', () => {
  let blocker: ScriptBlocker

  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    blocker = new ScriptBlocker()
  })

  it('finds all blocked scripts', () => {
    document.body.innerHTML = `
      <script type="text/plain" data-consent="analytics" data-src="https://example.com/analytics.js"></script>
      <script type="text/plain" data-consent="marketing" data-src="https://example.com/ads.js"></script>
      <script type="text/javascript" src="https://example.com/normal.js"></script>
    `
    const blocked = blocker.getBlockedElements()
    expect(blocked).toHaveLength(2)
  })

  it('activates scripts for a given category', () => {
    document.body.innerHTML = `
      <script type="text/plain" data-consent="analytics" data-src="https://example.com/analytics.js"></script>
      <script type="text/plain" data-consent="marketing" data-src="https://example.com/ads.js"></script>
    `

    blocker.activateCategory('analytics')

    const scripts = document.querySelectorAll('script')
    const analyticsScript = Array.from(scripts).find(s => s.src.includes('analytics'))
    const marketingScript = Array.from(scripts).find(s => s.getAttribute('data-consent') === 'marketing')

    // Analytics script should be replaced with an active one
    expect(document.querySelectorAll('[data-consent="analytics"][type="text/plain"]')).toHaveLength(0)
    // Marketing should remain blocked
    expect(marketingScript?.type).toBe('text/plain')
  })

  it('handles blocked iframes', () => {
    document.body.innerHTML = `
      <iframe data-consent="functional" data-src="https://youtube.com/embed/123" src="about:blank"></iframe>
    `

    blocker.activateCategory('functional')

    const iframe = document.querySelector('iframe')
    expect(iframe?.src).toContain('youtube.com')
  })

  it('deactivates scripts when consent is revoked', () => {
    document.body.innerHTML = `
      <script type="text/plain" data-consent="analytics" data-src="https://example.com/analytics.js"></script>
    `

    blocker.activateCategory('analytics')
    // After activation, there should be an active script
    expect(document.querySelectorAll('[data-consent="analytics"][type="text/plain"]')).toHaveLength(0)

    blocker.deactivateCategory('analytics')
    // After deactivation, the script should be blocked again
    expect(document.querySelectorAll('[data-consent="analytics"][type="text/plain"]')).toHaveLength(1)
  })
})
```

**Step 2: Run tests — verify they fail**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm test
```

Expected: FAIL

**Step 3: Implement ScriptBlocker**

Create `packages/widget/src/blocker.ts`:

```typescript
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

    for (const [element, info] of this.blockedElements) {
      if (info.category !== category) continue

      if (info.tagName === 'script') {
        const newScript = document.createElement('script')
        newScript.src = info.src
        newScript.type = 'text/javascript'
        newScript.setAttribute('data-consent', category)
        newScript.setAttribute('data-consent-activated', 'true')
        element.parentNode?.replaceChild(newScript, element)
        this.blockedElements.delete(element)
        this.blockedElements.set(newScript, { ...info, original: newScript })
      } else if (info.tagName === 'iframe') {
        ;(element as HTMLIFrameElement).src = info.src
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
        ;(element as HTMLIFrameElement).src = 'about:blank'
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
```

**Step 4: Run tests — verify they pass**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm test
```

Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add packages/widget/src/blocker.ts packages/widget/src/__tests__/blocker.test.ts
git commit -m "feat: add script blocker with MutationObserver support"
```

---

## Task 5: Google Consent Mode v2

**Files:**
- Create: `packages/widget/src/gcm.ts`
- Test: `packages/widget/src/__tests__/gcm.test.ts`

**Step 1: Write failing tests**

Create `packages/widget/src/__tests__/gcm.test.ts`:

```typescript
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
```

**Step 2: Run tests — verify they fail**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm test
```

**Step 3: Implement GoogleConsentMode**

Create `packages/widget/src/gcm.ts`:

```typescript
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
```

**Step 4: Run tests — verify they pass**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm test
```

Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add packages/widget/src/gcm.ts packages/widget/src/__tests__/gcm.test.ts
git commit -m "feat: add Google Consent Mode v2 integration"
```

---

## Task 6: Widget UI — Shadow DOM Banner

**Files:**
- Create: `packages/widget/src/ui/banner.ts`
- Create: `packages/widget/src/ui/styles.ts`
- Create: `packages/widget/src/ui/preferences.ts`
- Create: `packages/widget/src/ui/mount.ts`
- Test: `packages/widget/src/__tests__/ui.test.ts`

**Step 1: Write failing tests**

Create `packages/widget/src/__tests__/ui.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mountWidget, unmountWidget } from '../ui/mount'

describe('Widget UI', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts inside Shadow DOM', () => {
    const host = mountWidget({
      onAcceptAll: () => {},
      onRejectAll: () => {},
      onSaveCustom: () => {},
      categories: [
        { key: 'essential', label_fr: 'Essentiels', description_fr: 'Nécessaires au fonctionnement', is_essential: true, cookies: [] },
        { key: 'analytics', label_fr: 'Analytics', description_fr: "Mesure d'audience", is_essential: false, cookies: [] }
      ],
      theme: {
        position: 'bottom',
        colors: { primary: '#000', background: '#fff', text: '#333' },
        texts: {},
        logo_url: null
      }
    })

    expect(host).toBeTruthy()
    expect(host.shadowRoot).toBeTruthy()
    const banner = host.shadowRoot!.querySelector('[data-cmp-banner]')
    expect(banner).toBeTruthy()
  })

  it('has symmetric accept and reject buttons', () => {
    const host = mountWidget({
      onAcceptAll: () => {},
      onRejectAll: () => {},
      onSaveCustom: () => {},
      categories: [],
      theme: { position: 'bottom', colors: { primary: '#000', background: '#fff', text: '#333' }, texts: {}, logo_url: null }
    })

    const shadow = host.shadowRoot!
    const acceptBtn = shadow.querySelector('[data-cmp-accept]') as HTMLElement
    const rejectBtn = shadow.querySelector('[data-cmp-reject]') as HTMLElement

    expect(acceptBtn).toBeTruthy()
    expect(rejectBtn).toBeTruthy()

    // CNIL: same visual prominence — verify same CSS classes/styles
    const acceptStyle = acceptBtn.getAttribute('class')
    const rejectStyle = rejectBtn.getAttribute('class')
    // Both must have the same button class (same size, same prominence)
    expect(acceptStyle).toContain('cmp-btn-primary')
    expect(rejectStyle).toContain('cmp-btn-primary')
  })

  it('opens preferences panel', () => {
    const host = mountWidget({
      onAcceptAll: () => {},
      onRejectAll: () => {},
      onSaveCustom: () => {},
      categories: [
        { key: 'analytics', label_fr: 'Analytics', description_fr: "Mesure d'audience", is_essential: false, cookies: [] }
      ],
      theme: { position: 'bottom', colors: { primary: '#000', background: '#fff', text: '#333' }, texts: {}, logo_url: null }
    })

    const shadow = host.shadowRoot!
    const customizeBtn = shadow.querySelector('[data-cmp-customize]') as HTMLElement
    customizeBtn.click()

    const prefsPanel = shadow.querySelector('[data-cmp-preferences]') as HTMLElement
    expect(prefsPanel).toBeTruthy()
    expect(prefsPanel.style.display).not.toBe('none')
  })

  it('calls onAcceptAll when accept is clicked', () => {
    let called = false
    const host = mountWidget({
      onAcceptAll: () => { called = true },
      onRejectAll: () => {},
      onSaveCustom: () => {},
      categories: [],
      theme: { position: 'bottom', colors: { primary: '#000', background: '#fff', text: '#333' }, texts: {}, logo_url: null }
    })

    const shadow = host.shadowRoot!
    const acceptBtn = shadow.querySelector('[data-cmp-accept]') as HTMLElement
    acceptBtn.click()

    expect(called).toBe(true)
  })

  it('unmounts cleanly', () => {
    const host = mountWidget({
      onAcceptAll: () => {},
      onRejectAll: () => {},
      onSaveCustom: () => {},
      categories: [],
      theme: { position: 'bottom', colors: { primary: '#000', background: '#fff', text: '#333' }, texts: {}, logo_url: null }
    })

    unmountWidget()
    expect(document.querySelector('[data-cmp-host]')).toBeNull()
  })
})
```

**Step 2: Run tests — verify they fail**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm test
```

**Step 3: Implement styles**

Create `packages/widget/src/ui/styles.ts`:

```typescript
export function getStyles(colors: { primary: string; background: string; text: string }): string {
  return `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: ${colors.text};
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .cmp-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      pointer-events: none;
    }

    .cmp-banner {
      pointer-events: auto;
      background: ${colors.background};
      border-top: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 -2px 16px rgba(0,0,0,0.08);
      padding: 20px 24px;
      width: 100%;
      max-width: 720px;
      margin: 0 auto 16px;
      border-radius: 12px;
    }

    .cmp-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: ${colors.text};
    }

    .cmp-description {
      font-size: 14px;
      color: ${colors.text};
      opacity: 0.8;
      margin-bottom: 16px;
    }

    .cmp-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .cmp-btn-primary {
      padding: 10px 20px;
      border-radius: 8px;
      border: 2px solid ${colors.primary};
      background: ${colors.primary};
      color: ${colors.background};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
      flex: 1;
      min-width: 120px;
      text-align: center;
    }

    .cmp-btn-primary:hover { opacity: 0.85; }

    .cmp-btn-secondary {
      padding: 10px 20px;
      border-radius: 8px;
      border: 2px solid ${colors.primary};
      background: transparent;
      color: ${colors.primary};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .cmp-btn-secondary:hover { opacity: 0.7; }

    .cmp-preferences {
      margin-top: 16px;
      border-top: 1px solid rgba(0,0,0,0.1);
      padding-top: 16px;
    }

    .cmp-category {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .cmp-category-info { flex: 1; margin-right: 16px; }

    .cmp-category-label {
      font-weight: 500;
      font-size: 14px;
    }

    .cmp-category-desc {
      font-size: 13px;
      opacity: 0.7;
      margin-top: 2px;
    }

    .cmp-toggle {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .cmp-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .cmp-toggle-track {
      position: absolute;
      inset: 0;
      background: #ccc;
      border-radius: 24px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .cmp-toggle-track::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .cmp-toggle input:checked + .cmp-toggle-track {
      background: ${colors.primary};
    }

    .cmp-toggle input:checked + .cmp-toggle-track::after {
      transform: translateX(20px);
    }

    .cmp-toggle input:disabled + .cmp-toggle-track {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .cmp-save-row {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
  `
}
```

**Step 4: Implement banner**

Create `packages/widget/src/ui/banner.ts`:

```typescript
import type { ConsentCategories, WidgetConfig } from '../types'

interface BannerCallbacks {
  onAcceptAll: () => void
  onRejectAll: () => void
  onSaveCustom: (categories: ConsentCategories) => void
  onCustomize: () => void
}

export function createBanner(config: WidgetConfig, callbacks: BannerCallbacks): HTMLElement {
  const banner = document.createElement('div')
  banner.className = 'cmp-banner'
  banner.setAttribute('data-cmp-banner', '')
  banner.setAttribute('role', 'dialog')
  banner.setAttribute('aria-label', 'Gestion des cookies')

  const title = config.theme.texts.title ?? 'Ce site utilise des cookies'
  const description = config.theme.texts.description
    ?? 'Nous utilisons des cookies pour améliorer votre expérience et mesurer l\'audience.'

  banner.innerHTML = `
    <div class="cmp-title">${title}</div>
    <div class="cmp-description">${description}</div>
    <div class="cmp-actions">
      <button class="cmp-btn-secondary" data-cmp-customize>Personnaliser</button>
      <button class="cmp-btn-primary" data-cmp-reject>Tout refuser</button>
      <button class="cmp-btn-primary" data-cmp-accept>Accepter</button>
    </div>
  `

  banner.querySelector('[data-cmp-accept]')!.addEventListener('click', callbacks.onAcceptAll)
  banner.querySelector('[data-cmp-reject]')!.addEventListener('click', callbacks.onRejectAll)
  banner.querySelector('[data-cmp-customize]')!.addEventListener('click', callbacks.onCustomize)

  return banner
}
```

**Step 5: Implement preferences panel**

Create `packages/widget/src/ui/preferences.ts`:

```typescript
import type { ConsentCategories, WidgetConfig } from '../types'

export function createPreferences(
  config: WidgetConfig,
  onSave: (categories: ConsentCategories) => void
): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'cmp-preferences'
  panel.setAttribute('data-cmp-preferences', '')
  panel.style.display = 'none'

  const categoriesHtml = (config.categories ?? []).map(cat => `
    <div class="cmp-category">
      <div class="cmp-category-info">
        <div class="cmp-category-label">${cat.label_fr}</div>
        <div class="cmp-category-desc">${cat.description_fr}</div>
      </div>
      <label class="cmp-toggle">
        <input type="checkbox" data-cmp-toggle="${cat.key}"
          ${cat.is_essential ? 'checked disabled' : ''}
        />
        <span class="cmp-toggle-track"></span>
      </label>
    </div>
  `).join('')

  panel.innerHTML = `
    ${categoriesHtml}
    <div class="cmp-save-row">
      <button class="cmp-btn-primary" data-cmp-save>Enregistrer mes choix</button>
    </div>
  `

  panel.querySelector('[data-cmp-save]')!.addEventListener('click', () => {
    const categories: ConsentCategories = {
      essential: true,
      analytics: (panel.querySelector('[data-cmp-toggle="analytics"]') as HTMLInputElement)?.checked ?? false,
      marketing: (panel.querySelector('[data-cmp-toggle="marketing"]') as HTMLInputElement)?.checked ?? false,
      functional: (panel.querySelector('[data-cmp-toggle="functional"]') as HTMLInputElement)?.checked ?? false
    }
    onSave(categories)
  })

  return panel
}
```

**Step 6: Implement mount/unmount**

Create `packages/widget/src/ui/mount.ts`:

```typescript
import type { ConsentCategories, WidgetConfig } from '../types'
import { getStyles } from './styles'
import { createBanner } from './banner'
import { createPreferences } from './preferences'

interface MountOptions {
  onAcceptAll: () => void
  onRejectAll: () => void
  onSaveCustom: (categories: ConsentCategories) => void
  categories: WidgetConfig['categories']
  theme: WidgetConfig['theme']
}

const HOST_ATTR = 'data-cmp-host'
let hostElement: HTMLElement | null = null

export function mountWidget(options: MountOptions): HTMLElement {
  unmountWidget()

  const host = document.createElement('div')
  host.setAttribute(HOST_ATTR, '')
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = getStyles(options.theme.colors)
  shadow.appendChild(style)

  const overlay = document.createElement('div')
  overlay.className = 'cmp-overlay'

  const config: WidgetConfig = {
    siteId: '',
    apiUrl: '',
    categories: options.categories,
    theme: options.theme
  }

  const prefsPanel = createPreferences(config, options.onSaveCustom)

  const banner = createBanner(config, {
    onAcceptAll: options.onAcceptAll,
    onRejectAll: options.onRejectAll,
    onSaveCustom: options.onSaveCustom,
    onCustomize: () => {
      prefsPanel.style.display = prefsPanel.style.display === 'none' ? 'block' : 'none'
    }
  })

  banner.appendChild(prefsPanel)
  overlay.appendChild(banner)
  shadow.appendChild(overlay)
  document.body.appendChild(host)

  hostElement = host
  return host
}

export function unmountWidget(): void {
  if (hostElement) {
    hostElement.remove()
    hostElement = null
    return
  }
  const existing = document.querySelector(`[${HOST_ATTR}]`)
  existing?.remove()
}

export function hideWidget(): void {
  if (!hostElement) return
  const overlay = hostElement.shadowRoot?.querySelector('.cmp-overlay') as HTMLElement
  if (overlay) overlay.style.display = 'none'
}

export function showWidget(): void {
  if (!hostElement) return
  const overlay = hostElement.shadowRoot?.querySelector('.cmp-overlay') as HTMLElement
  if (overlay) overlay.style.display = 'flex'
}
```

**Step 7: Run tests — verify they pass**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm test
```

Expected: PASS (all 5 UI tests + previous tests)

**Step 8: Commit**

```bash
git add packages/widget/src/ui/ packages/widget/src/__tests__/ui.test.ts
git commit -m "feat: add Shadow DOM banner UI with CNIL-compliant button symmetry"
```

---

## Task 7: Widget Entry Point — Wire Everything Together

**Files:**
- Create: `packages/widget/src/index.ts`
- Test: `packages/widget/src/__tests__/integration.test.ts`

**Step 1: Write integration test**

Create `packages/widget/src/__tests__/integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Widget integration', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
    })
    localStorage.clear()
    ;(globalThis as any).dataLayer = []
    ;(globalThis as any).gtag = vi.fn()
  })

  it('exports CMP.init function', async () => {
    const { init } = await import('../index')
    expect(typeof init).toBe('function')
  })
})
```

**Step 2: Implement entry point**

Create `packages/widget/src/index.ts`:

```typescript
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

interface CMPInstance {
  show: () => void
  hide: () => void
  revoke: () => void
  getConsent: () => ConsentCategories | null
}

export function init(options?: { siteId?: string; apiUrl?: string }): CMPInstance {
  const script = document.currentScript ?? document.querySelector('script[data-site]')
  const siteId = options?.siteId ?? script?.getAttribute('data-site') ?? ''
  const apiUrl = options?.apiUrl ?? script?.getAttribute('data-api') ?? DEFAULT_API_URL

  if (!siteId) {
    console.warn('[CMP] Missing data-site attribute')
    return { show: () => {}, hide: () => {}, revoke: () => {}, getConsent: () => null }
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
    return {
      show: () => showWidget(),
      hide: () => hideWidget(),
      revoke: () => {
        manager.revokeConsent()
        gcm.updateConsent({ essential: true, analytics: false, marketing: false, functional: false })
        blocker.applyConsent({ essential: true, analytics: false, marketing: false, functional: false })
      },
      getConsent: () => manager.getCurrentConsent()
    }
  }

  function handleConsent(categories: ConsentCategories): void {
    gcm.updateConsent(categories)
    blocker.applyConsent(categories)
    blocker.startObserving()
    hideWidget()
  }

  mountWidget({
    onAcceptAll: () => {
      manager.acceptAll().then(() => {
        handleConsent({ essential: true, analytics: true, marketing: true, functional: true })
      })
    },
    onRejectAll: () => {
      manager.rejectAll().then(() => {
        handleConsent({ essential: true, analytics: false, marketing: false, functional: false })
      })
    },
    onSaveCustom: (categories) => {
      manager.saveCustom(categories).then(() => {
        handleConsent(categories)
      })
    },
    categories: DEFAULT_CATEGORIES,
    theme: DEFAULT_THEME
  })

  return {
    show: () => showWidget(),
    hide: () => hideWidget(),
    revoke: () => {
      manager.revokeConsent()
      gcm.updateConsent({ essential: true, analytics: false, marketing: false, functional: false })
      blocker.applyConsent({ essential: true, analytics: false, marketing: false, functional: false })
      showWidget()
    },
    getConsent: () => manager.getCurrentConsent()
  }
}

// Auto-init when script loads with data-site attribute
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init())
  } else {
    init()
  }
}
```

**Step 3: Build widget and check size**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm run build
ls -la dist/consent.js
gzip -c dist/consent.js | wc -c
```

Expected: < 15KB gzipped

**Step 4: Run all tests**

```bash
cd /Users/simonbelissa/Desktop/projets/cmp && npm test
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/widget/src/index.ts packages/widget/src/__tests__/integration.test.ts
git commit -m "feat: wire widget entry point with auto-init and revoke support"
```

---

## Task 8: Test Page + Local E2E

**Files:**
- Create: `packages/widget/test/index.html`
- Create: `packages/widget/test/serve.ts`

**Step 1: Create test HTML page**

Create `packages/widget/test/index.html`:

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMP Test Page</title>

  <!-- Google Consent Mode v2 default (before CMP loads) -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
  </script>

  <!-- CMP Widget -->
  <script src="../dist/consent.js" data-site="test_site_001" data-api="http://localhost:8787" async></script>

  <!-- Blocked analytics script -->
  <script type="text/plain" data-consent="analytics" data-src="https://www.google-analytics.com/analytics.js"></script>

  <!-- Blocked marketing script -->
  <script type="text/plain" data-consent="marketing" data-src="https://www.googletagmanager.com/gtag/js"></script>

  <!-- Blocked iframe -->
</head>
<body>
  <h1>CMP Test Page</h1>
  <p>This page tests the consent widget.</p>

  <iframe data-consent="functional" data-src="https://www.youtube.com/embed/dQw4w9WgXcQ" src="about:blank" width="560" height="315"></iframe>

  <hr>
  <h2>Controls</h2>
  <button onclick="CMP.init().show()">Show banner</button>
  <button onclick="CMP.init().revoke()">Revoke consent</button>
  <button onclick="console.log(CMP.init().getConsent())">Log consent</button>

  <hr>
  <h2>Consent status</h2>
  <pre id="status">Checking...</pre>

  <script>
    setInterval(() => {
      const consent = document.cookie.match(/_consent_test_site_001=([^;]*)/)
      document.getElementById('status').textContent = consent
        ? JSON.stringify(JSON.parse(decodeURIComponent(consent[1])), null, 2)
        : 'No consent'
    }, 1000)
  </script>
</body>
</html>
```

**Step 2: Test manually**

```bash
# Terminal 1: Start the worker locally
cd /Users/simonbelissa/Desktop/projets/cmp/packages/worker && npm run dev

# Terminal 2: Build and serve the widget
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm run build
npx serve test/ -p 3000
```

Open `http://localhost:3000` and verify:
- [ ] Banner appears on first visit
- [ ] "Tout refuser" and "Accepter" are same size
- [ ] "Personnaliser" opens preferences
- [ ] Clicking "Accepter" hides the banner
- [ ] Refresh: banner does not reappear (consent stored)
- [ ] Blocked scripts remain `type="text/plain"` before consent
- [ ] After accepting analytics, analytics script activates
- [ ] "Revoke consent" brings the banner back

**Step 3: Commit**

```bash
git add packages/widget/test/
git commit -m "feat: add local test page for manual QA"
```

---

## Task 9: Seed Config for Dogfood Sites

**Files:**
- Create: `packages/worker/src/seed/configs.ts`

**Step 1: Create site configs for cveuro.com and anaba.io**

Create `packages/worker/src/seed/configs.ts`:

```typescript
import type { SiteConfig } from '../types'

export const DOGFOOD_CONFIGS: Record<string, SiteConfig> = {
  cveuro: {
    site_id: 'cveuro',
    domain: 'cveuro.com',
    categories: [
      {
        key: 'essential',
        label_fr: 'Essentiels',
        description_fr: 'Cookies nécessaires au fonctionnement du site (session, authentification, préférences).',
        is_essential: true,
        cookies: [
          { name: 'session', provider: 'cveuro.com', description_fr: 'Session utilisateur', duration: 'Session' }
        ]
      },
      {
        key: 'analytics',
        label_fr: 'Mesure d\'audience',
        description_fr: 'Nous permettent de comprendre comment vous utilisez le site pour l\'améliorer.',
        is_essential: false,
        cookies: [
          { name: '_ga', provider: 'Google Analytics', description_fr: 'Identifiant unique de visite', duration: '2 ans' },
          { name: '_ga_*', provider: 'Google Analytics', description_fr: 'Suivi de session', duration: '2 ans' }
        ]
      },
      {
        key: 'marketing',
        label_fr: 'Marketing',
        description_fr: 'Utilisés pour le suivi publicitaire et la mesure des conversions.',
        is_essential: false,
        cookies: [
          { name: '_gcl_au', provider: 'Google Ads', description_fr: 'Suivi de conversion', duration: '90 jours' },
          { name: '_gac_*', provider: 'Google Ads', description_fr: 'Données de campagne', duration: '90 jours' }
        ]
      },
      {
        key: 'functional',
        label_fr: 'Fonctionnels',
        description_fr: 'Permettent des fonctionnalités avancées (vidéos, chat).',
        is_essential: false,
        cookies: []
      }
    ],
    theme: {
      position: 'bottom',
      colors: { primary: '#1a1a1a', background: '#ffffff', text: '#333333' },
      texts: {
        title: 'Vos cookies, votre choix',
        description: 'Nous utilisons des cookies pour améliorer votre expérience sur cveuro.com et mesurer l\'audience. Vous pouvez accepter, refuser ou personnaliser vos préférences.'
      },
      logo_url: null
    }
  },
  anaba: {
    site_id: 'anaba',
    domain: 'anaba.io',
    categories: [
      {
        key: 'essential',
        label_fr: 'Essentiels',
        description_fr: 'Cookies nécessaires au fonctionnement du site.',
        is_essential: true,
        cookies: [
          { name: 'sb-*', provider: 'Supabase', description_fr: 'Session et authentification', duration: 'Session' }
        ]
      },
      {
        key: 'analytics',
        label_fr: 'Mesure d\'audience',
        description_fr: 'Nous permettent de comprendre comment vous utilisez le site.',
        is_essential: false,
        cookies: [
          { name: '_ga', provider: 'Google Analytics', description_fr: 'Identifiant unique de visite', duration: '2 ans' }
        ]
      },
      {
        key: 'marketing',
        label_fr: 'Marketing',
        description_fr: 'Suivi publicitaire et mesure des conversions.',
        is_essential: false,
        cookies: [
          { name: '_gcl_au', provider: 'Google Ads', description_fr: 'Suivi de conversion', duration: '90 jours' }
        ]
      },
      {
        key: 'functional',
        label_fr: 'Fonctionnels',
        description_fr: 'Vidéos intégrées et fonctionnalités avancées.',
        is_essential: false,
        cookies: []
      }
    ],
    theme: {
      position: 'bottom',
      colors: { primary: '#0f172a', background: '#ffffff', text: '#334155' },
      texts: {
        title: 'Gestion des cookies',
        description: 'Nous utilisons des cookies pour améliorer votre expérience sur anaba.io et mesurer notre audience.'
      },
      logo_url: null
    }
  }
}
```

**Step 2: Wire config route to use seed data**

Update `packages/worker/src/routes/config.ts` to serve dogfood configs:

```typescript
import { Hono } from 'hono'
import type { Env, SiteConfig } from '../types'
import { DOGFOOD_CONFIGS } from '../seed/configs'

const config = new Hono<{ Bindings: Env }>()

config.get('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')

  // Check KV cache first
  const cached = await c.env.CONFIG_CACHE.get(`config:${siteId}`, 'json')
  if (cached) {
    return c.json(cached)
  }

  // Fallback to hardcoded dogfood configs
  const dogfoodConfig = DOGFOOD_CONFIGS[siteId]
  if (dogfoodConfig) {
    // Cache in KV for 60s
    await c.env.CONFIG_CACHE.put(
      `config:${siteId}`,
      JSON.stringify(dogfoodConfig),
      { expirationTtl: 60 }
    )
    return c.json(dogfoodConfig)
  }

  return c.json({ error: 'Site not found' }, 404)
})

export { config }
```

**Step 3: Commit**

```bash
git add packages/worker/src/seed/ packages/worker/src/routes/config.ts
git commit -m "feat: add dogfood site configs for cveuro and anaba"
```

---

## Task 10: Deploy to Cloudflare

**Step 1: Create Cloudflare resources**

```bash
# Create D1 database
cd /Users/simonbelissa/Desktop/projets/cmp/packages/worker
npx wrangler d1 create cmp-consents-prod

# Create KV namespace
npx wrangler kv namespace create CONFIG_CACHE
```

Note the IDs and update `wrangler.toml` with production values.

**Step 2: Run D1 migration**

```bash
npx wrangler d1 execute cmp-consents-prod --file=src/db/schema.sql
```

**Step 3: Set secrets**

```bash
npx wrangler secret put PROOF_SECRET
# Enter a strong random secret
```

**Step 4: Deploy worker**

```bash
npx wrangler deploy
```

Note the deployed URL (e.g., `https://cmp-api.simon-b.workers.dev`).

**Step 5: Build production widget**

Update the `DEFAULT_API_URL` in `packages/widget/src/index.ts` to the deployed worker URL, then:

```bash
cd /Users/simonbelissa/Desktop/projets/cmp/packages/widget && npm run build
```

**Step 6: Upload widget to Cloudflare R2/Pages or serve via worker**

Option A (simple, for dogfood): serve `consent.js` as a static asset from the worker.

Add to `wrangler.toml`:

```toml
[assets]
directory = "../widget/dist"
```

Option B (better): Cloudflare Pages with the widget dist.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: deploy worker to Cloudflare with D1 and KV"
```

---

## Task 11: Integrate on cveuro.com

**Step 1: Add widget script tag to cveuro.com**

In the `<head>` of the main HTML/layout:

```html
<!-- Google Consent Mode v2 defaults -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
</script>

<!-- CMP Widget -->
<script src="https://cmp-api.simon-b.workers.dev/consent.js" data-site="cveuro" async></script>
```

**Step 2: Mark existing tracking scripts as blocked**

Replace each tracking script's `type` and `src`:

```html
<!-- BEFORE -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>

<!-- AFTER -->
<script type="text/plain" data-consent="analytics" data-src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>
```

**Step 3: Add "Gérer mes cookies" link in footer**

```html
<a href="#" onclick="event.preventDefault(); window.CMP && CMP.init().show()">
  Gérer mes cookies
</a>
```

**Step 4: Verify**

- [ ] Visit cveuro.com — banner appears
- [ ] No tracking cookies before consent (check DevTools → Application → Cookies)
- [ ] Accept → Google Analytics loads
- [ ] Refuse → No tracking cookies
- [ ] Refresh → banner does not reappear
- [ ] Footer link → banner reappears
- [ ] Check Cloudflare Workers logs for consent records

**Step 5: Commit changes on cveuro project**

```bash
cd /path/to/cveuro
git add -A
git commit -m "feat: integrate CMP consent widget"
```

---

## Task 12: Repeat for anaba.io

Same as Task 11 but with `data-site="anaba"` and the appropriate site-specific scripts.

---

## Summary — What Phase 1 Delivers

| Deliverable | Status |
|-------------|--------|
| Widget JS (<15KB gzip) | ✅ |
| Shadow DOM isolation | ✅ |
| Cookie blocking (type="text/plain" + MutationObserver) | ✅ |
| CNIL-compliant UI (symmetric buttons, no dark patterns) | ✅ |
| Google Consent Mode v2 | ✅ |
| Cloudflare Workers API (Hono) | ✅ |
| D1 consent storage with proof tokens | ✅ |
| KV config cache | ✅ |
| IP truncation (RGPD) | ✅ |
| 13-month expiry + 25-month purge | ✅ |
| "Gérer mes cookies" revoke link | ✅ |
| Deployed on cveuro.com + anaba.io | ✅ |

**Next: Phase 2 — Dashboard (Next.js + Supabase)**
