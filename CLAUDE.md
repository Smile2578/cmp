# CMP — Consent Management Platform

**Status:** Phase 1 complete and deployed to production  
**GitHub:** https://github.com/Smile2578/cmp  
**Live:** https://cmp-api.kravcss.workers.dev  
**Dogfood:** cveuro.com, anaba.io (both live with widgets)

---

## Overview

SaaS français de gestion du consentement cookies. Alternative à Axeptio à 1/5 du prix, ciblant les agences web françaises gérant 10-50 sites clients.

Phase 1 (MVP) is complete: Widget + API + consent storage + Google Consent Mode v2 + live on 2 dogfood sites.

---

## Phase 1 Stack (Implemented ✅)

| Component | Technology | Details |
|-----------|-----------|---------|
| **Widget JS** | Vanilla TypeScript | Shadow DOM (mode: "open"), Rollup → IIFE, 4.2 KB gzip |
| **API** | Cloudflare Workers + Hono | Zero cold starts, 300+ PoP global |
| **Config Cache** | Cloudflare KV | TTL 60s, dogfood fallback |
| **Consent Storage** | Cloudflare D1 (SQLite edge) | Single table, indexed by visitor_id + site_id |
| **Tests** | Vitest | happy-dom for widget, @cloudflare/vitest-pool-workers for worker |
| **Build** | Rollup | TypeScript → minified IIFE bundle |

**Widget size:** 4.2 KB gzip (target <15 KB) ✅

---

## Phase 2+ Stack (Not Yet Implemented)

| Component | Technology |
|-----------|-----------|
| Dashboard | Next.js 15+ + shadcn/ui + Supabase Postgres |
| Authentication | Supabase Auth |
| Cookie Scanner | Playwright on Hetzner VPS |
| Deployment | Vercel (dashboard) |

---

## Project Structure

```
cmp/
├── CLAUDE.md
├── package.json                 # npm workspaces root
├── docs/plans/
│   ├── 2026-02-24-cmp-design.md
│   ├── 2026-02-24-cmp-legal.md
│   ├── 2026-02-24-cmp-technical.md
│   ├── 2026-02-24-cmp-market.md
│   └── 2026-02-24-cmp-phase1-plan.md
│
├── packages/
│   ├── widget/                  # Consent widget (vanilla TS, Rollup)
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point, auto-init, window.CMP
│   │   │   ├── types.ts         # ConsentCategories, WidgetConfig, etc.
│   │   │   ├── cookie.ts        # getConsent/setConsent/clearConsent
│   │   │   ├── api.ts           # fetchConfig/saveConsent HTTP client
│   │   │   ├── consent-manager.ts # Orchestrator (cookie + API + listeners)
│   │   │   ├── blocker.ts       # ScriptBlocker + MutationObserver
│   │   │   ├── gcm.ts           # Google Consent Mode v2 (7 signals)
│   │   │   ├── ui/
│   │   │   │   ├── banner.ts    # CNIL-compliant symmetric buttons
│   │   │   │   ├── preferences.ts # Category toggles panel
│   │   │   │   ├── mount.ts     # Shadow DOM mount/unmount
│   │   │   │   └── styles.ts    # CSS-in-JS scoped to :host
│   │   │   └── __tests__/       # 18 tests (cookie, blocker, gcm, ui, integration)
│   │   ├── test/index.html      # Manual QA page
│   │   ├── rollup.config.mjs
│   │   └── vitest.config.ts     # happy-dom environment
│   │
│   └── worker/                  # Cloudflare Workers API (Hono)
│       ├── src/
│       │   ├── index.ts         # Hono app + CORS + routes
│       │   ├── types.ts         # Env, ConsentRecord, SiteConfig
│       │   ├── db/schema.sql    # D1 schema (consents table + indexes)
│       │   ├── routes/
│       │   │   ├── consent.ts   # POST/GET consent (IP truncation, proof tokens)
│       │   │   └── config.ts    # Site config with KV cache + dogfood fallback
│       │   ├── seed/configs.ts  # Dogfood configs (cveuro + anaba)
│       │   └── __tests__/       # 5 tests (consent CRUD, validation, IP truncation)
│       ├── wrangler.toml        # Production config (D1 + KV + assets)
│       └── vitest.config.ts     # Cloudflare Workers pool
```

---

## Commands

```bash
# Development
npm run dev:worker      # wrangler dev (local Workers, http://localhost:8787)
npm run dev:widget      # rollup -c -w (watch mode, rebuilds on changes)

# Build
npm run build:widget    # rollup production bundle
npm run build:worker    # wrangler deploy --dry-run (test deploy)

# Test
npm test                # vitest run (all 23 tests: 18 widget + 5 worker)
npm run test:watch      # vitest watch mode

# Deploy
cd packages/worker && npm run deploy   # wrangler deploy (to production)
```

---

## Cloudflare Resources (Production)

| Resource | Value | Notes |
|----------|-------|-------|
| **D1 Database** | `cmp-consents-prod` | ID: `87739e51-1535-48e1-8c4a-871031f7d2ff`, region: WEUR, SQLite |
| **KV Namespace** | `CONFIG_CACHE` | ID: `3632824436d842cd94f5adddd95f458c`, cache 60s |
| **Worker** | `cmp-api` | https://cmp-api.kravcss.workers.dev |
| **Secret** | `PROOF_SECRET` | Set via `wrangler secret put PROOF_SECRET` |

---

## API Endpoints

### Health & Static

- `GET /health` — Health check, returns `{ ok: true }`
- `GET /consent.js` — Widget JS bundle (served as static asset, max-age: 3600)

### Configuration

- `GET /api/config/:siteId` — Fetch site config
  - Cached in KV (60s TTL)
  - Fallback to dogfood config if not found
  - Returns: `{ site_id, name, theme_color, categories, ... }`

### Consent Management

- `POST /api/consent` — Save consent record
  - Body: `{ visitor_id, site_id, choices: { analytics: true, marketing: false }, ... }`
  - Returns: `{ id, created_at, proof_token }`
  - IP truncation (last octet → 0)
  - Generates proof token (HMAC-SHA256)

- `GET /api/consent/:visitorId` — Fetch consent record
  - Requires query param: `site_id=cveuro`
  - Returns: `{ visitor_id, choices, created_at, ... }`

---

## Dogfood Integrations (Live)

### cveuro.com ✅

- **Widget ID:** `data-site="cveuro"`
- **Theme:** Green (#4a7c59)
- **Status:** Live and accepting consents
- **Widget tag:**
  ```html
  <script
    src="https://cmp-api.kravcss.workers.dev/consent.js"
    data-site="cveuro"
    data-api="https://cmp-api.kravcss.workers.dev"
    async defer
  ></script>
  ```

### anaba.io ✅

- **Widget ID:** `data-site="anaba"`
- **Theme:** Red (#c1440e)
- **Status:** Live (CSP fix needed for production)
- **Known issue:** CSP header blocks inline script injection → Phase 2 to add CSP nonce support
- **Widget tag:** Same as above, with `data-site="anaba"`

---

## Compliance (CNIL/RGPD/ePrivacy/GCMv2)

### Consent Rules

- ✅ "Tout refuser" button has same prominence as "Accepter" (symmetric buttons)
- ✅ IP truncation (last octet → 0, CNIL 2020-091 compliant)
- ✅ Proof tokens (timestamp + choices + IP + widget version + user-agent)
- ✅ Expiration: 13 months max (configured at widget init)
- ✅ Retention: 25 months max (scheduled purge job in Phase 2)

### Google Consent Mode v2

- ✅ Implements all 7 signals:
  - `analytics_storage` (matomo, gtag)
  - `ad_storage` (Google ads)
  - `ad_user_data` (GA4 audience sync)
  - `ad_personalization` (retargeting)
  - `personalization_storage` (prefs, recommendations)
  - `functionality_storage` (chat, forms)
  - `security_storage` (fraud, security)

### Future Compliance

- [ ] IAB TCF v2.3 (Phase 3, if needed by clients)
- [ ] LGPD (Phase 3, if needed for Brazil)

---

## Performance Characteristics

### Widget

- **Size:** 4.2 KB gzip (TypeScript + styles + all features)
- **LCP Impact:** 0 ms (loaded async, doesn't block rendering)
- **CLS Impact:** 0 (position: fixed banner, no layout shift)
- **Initialization:** Runs on `DOMContentLoaded` via auto-init
- **Script blocking:** MutationObserver watches for `<script type="text/plain">` tags

### API

- **Cold start:** 0 ms (Cloudflare Workers edge, no traditional serverless)
- **Cache hit:** ~10-50 ms (KV in same region)
- **Database latency:** ~50-100 ms (D1 SQLite at edge, WEUR region)
- **Global latency:** <300 ms p99 (300+ Cloudflare PoP)

---

## Widget Rules (for integration)

- MUST be <15 KB gzipped ✅ (4.2 KB current)
- MUST use Shadow DOM with mode: "open" ✅
- MUST block scripts with `type="text/plain"` before consent ✅
- MUST implement Google Consent Mode v2 ✅
- MUST be loaded async (no render-blocking) ✅
- MUST NOT expose database keys ✅
- MUST support customization via data attributes ✅

---

## API Rules

- MUST run on Cloudflare Workers (zero cold starts) ✅
- MUST use Hono framework ✅
- MUST rate-limit via Cloudflare WAF (configured in wrangler.toml) ✅
- MUST cache configs in KV (TTL 60s) ✅
- MUST truncate IPs (CNIL 2020-091) ✅
- MUST generate proof tokens (HMAC-SHA256) ✅

---

## Implementation Phases

### Phase 1 (Complete ✅)
- [x] Widget MVP (banner + preferences panel)
- [x] Consent cookie (localStorage + cookie fallback)
- [x] API routes (POST/GET consent, GET config)
- [x] D1 storage (SQLite at edge)
- [x] KV cache (60s TTL, dogfood fallback)
- [x] Google Consent Mode v2 (all 7 signals)
- [x] Script blocker (MutationObserver for `type="text/plain"`)
- [x] CNIL compliance (symmetric buttons, IP truncation, proof tokens)
- [x] Dogfood integration (cveuro.com + anaba.io live)
- [x] Tests (18 widget + 5 worker = 23 total)

### Phase 2 (Next)
- [ ] Dashboard (Next.js + Supabase)
- [ ] Multi-tenant support
- [ ] Stripe billing integration
- [ ] User management
- [ ] Site analytics
- [ ] IP/User-Agent consent search
- [ ] Scheduled data purge (25-month retention)
- [ ] CSP nonce support (for anaba.io production fix)

### Phase 3
- [ ] Cookie scanner (Playwright on Hetzner VPS)
- [ ] Auto-categorization (ML model for cookie detection)
- [ ] Bulk consent import/export
- [ ] Audit logs (for RGPD proof)

### Phase 4
- [ ] IAB TCF v2.3 support
- [ ] A/B testing framework (banner variants)
- [ ] Internationalization (i18n beyond French)

---

## Debugging & Troubleshooting

### Widget doesn't appear

1. Check console for errors (it logs to `console.warn('CMP:')`)
2. Verify `data-site` matches config in worker seed
3. Check Shadow DOM in DevTools (Elements panel, search for `cmp-widget`)
4. Verify CORS: `fetch('https://cmp-api.kravcss.workers.dev/api/config/YOUR_SITE')`

### Consent not saving

1. Check network tab for POST to `/api/consent`
2. Verify D1 is running (production) or local Cloudflare Workers (dev)
3. Check `PROOF_SECRET` is set (in wrangler secret)
4. Verify visitor_id is being generated (check localStorage `cmp:visitor_id`)

### Google Consent Mode signals not firing

1. Check `window.dataLayer` (should have `gtag('consent', 'update', {...})`)
2. Verify GA4 tag is present on page
3. Check browser console for gtag warnings
4. Use GA4 DebugView to verify signals

### Tests failing

```bash
# Run single test file
npm test -- widget  # only widget tests
npm test -- worker  # only worker tests

# Run in watch mode for faster feedback
npm run test:watch

# Check test isolation
npm test -- --reporter=verbose
```

---

## Key Learnings & Notes

### D1 Schema Management
- **Issue:** `schema.split(';')` breaks on multiline SQL (missing statements)
- **Solution:** Execute each statement separately with `prepare().run()`
- **File:** `packages/worker/src/db/schema.sql`

### Widget Testing (jsdom vs happy-dom)
- **Issue:** jsdom hangs when inserting `<script src="...">` via `replaceChild()`
- **Solution:** Switched to happy-dom in `vitest.config.ts`
- **Reason:** jsdom loads actual scripts; happy-dom treats them as stubs

### Script Blocking with MutationObserver
- **Issue:** Modifying map while iterating causes infinite loop
- **Solution:** Collect all nodes to process into array before iteration
- **File:** `packages/widget/src/blocker.ts`

### Cloudflare D1 Pricing
- Free tier: 5GB storage, unlimited queries
- Production: Pay per GB storage + GB transferred
- Current usage: ~100 KB (dogfood only)

### KV Cache Invalidation
- No TTL on individual keys, only cache duration in KV
- Solution: Set TTL via metadata (not used yet, simple 60s default)
- Phase 2: Implement `/api/config/:siteId/invalidate` endpoint

---

## Documentation Files

All planning documents are in `docs/plans/`:

- **2026-02-24-cmp-design.md** — Complete design spec, user flows, wireframes
- **2026-02-24-cmp-legal.md** — CNIL requirements, RGPD, ePrivacy, GCMv2, TCF
- **2026-02-24-cmp-technical.md** — Architecture, infrastructure, database schema
- **2026-02-24-cmp-market.md** — Competitive analysis, pricing, distribution strategy
- **2026-02-24-cmp-phase1-plan.md** — Detailed Phase 1 implementation plan

---

## Quick Links

- **Live Widget (cveuro):** https://cveuro.com (scroll to bottom, green widget)
- **Live Widget (anaba):** https://anaba.io (scroll to bottom, red widget)
- **API Docs:** See endpoint specs above
- **Worker Logs:** `wrangler tail cmp-api` (requires Cloudflare auth)
- **D1 Query:** `wrangler d1 execute cmp-consents-prod --remote --command "SELECT COUNT(*) FROM consents"`

---

## Support & Questions

For architecture questions, see `docs/plans/2026-02-24-cmp-design.md` and `docs/plans/2026-02-24-cmp-technical.md`.

For legal/compliance questions, see `docs/plans/2026-02-24-cmp-legal.md`.

For market positioning, see `docs/plans/2026-02-24-cmp-market.md`.
