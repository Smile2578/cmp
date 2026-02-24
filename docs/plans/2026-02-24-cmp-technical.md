# CMP — Recherche technique complète

> Date: 2026-02-24
> Source: Recherche approfondie GitHub, docs Cloudflare, benchmarks, comparatifs

---

## 1. Mécanismes de blocage des cookies

### Stratégie A : Blocage manuel (le plus fiable)

```html
<!-- AVANT : Script s'exécute immédiatement -->
<script type="text/javascript" src="https://analytics.example.com/track.js"></script>

<!-- APRÈS : Script inerte jusqu'au consentement -->
<script type="text/plain" data-consent-src="https://analytics.example.com/track.js"
        data-consent-category="analytics"></script>
```

Attributs clés :
- `type="text/plain"` — empêche le navigateur de parser/exécuter
- `data-consent-src` remplace `src` — empêche la requête HTTP
- `data-consent-category` — mappe vers les catégories de consentement

Au consentement : restaure `src` depuis `data-consent-src`, change `type` en `text/javascript`.

Même pattern pour iframes, images, vidéos, objects, embeds.

### Stratégie B : Blocage automatique (MutationObserver)

Script synchrone chargé en tout premier dans `<head>` qui :
1. Intercepte et bloque tous les `<script src="">` externes
2. Désactive les `<iframe>` en remplaçant `src` par `about:blank`
3. Surveille les scripts inline pour les opérations de cookies
4. Utilise MutationObserver pour les scripts injectés dynamiquement

**Limitations documentées :**
- Doit être le premier script — tout ce qui charge avant est non-bloquable
- Doit être synchrone — pas chargeable via GTM ou async
- Le preloading navigateur peut contourner le blocage
- Ne peut pas bloquer `(new Image()).src="..."` tracking pixels via JS

**Performance MutationObserver :**
- ~88x plus rapide que le polling avec `setTimeout()`
- Pour un CMP : observer `document.head` et `document.body` avec `{ childList: true, subtree: true }`

### Notre approche : Hybride

Blocage manuel (`type="text/plain"`) comme méthode principale + MutationObserver comme filet de sécurité pour les scripts dynamiques.

---

## 2. Tailles des widgets CMP (production)

Source : [Agence Web Performance](https://agencewebperformance.fr/en/cmp-web-performance-comparison/)

| CMP | JS async | JS sync | CSS | Images | DOM Nodes |
|-----|----------|---------|-----|--------|-----------|
| Osano | ~20 KB | 0 | <50 KB | 0 | ~50 |
| CookieYes | mid | 0 | <50 KB | 0 | ~140 |
| Didomi | mid | 0 | 80 KB | 0 | ~60 |
| Axeptio | low | 0 | inline | 51.6 KB (3 imgs) | ~60 |
| OneTrust | 124.1 KB | 0 | <50 KB | 0 | ~70 |
| UserCentrics | 206 KB | 0 | <50 KB | 0 | ~60 |
| Cookiebot | mid | 34 KB | <50 KB | 0 | 209 |

**Notre cible** : <15 KB gzippé (JS + CSS). Référence : orestbida/cookieconsent v3 fait ~5 KB gzip (JS seul).

---

## 3. Impact sur les Core Web Vitals

### LCP (Largest Contentful Paint)
- Le banner peut devenir l'élément LCP, gonflant les scores de 1.43s à 3.61s
- Fix : charger le CMP async, utiliser `preconnect` vers le domaine CMP

### CLS (Cumulative Layout Shift)
- Les banners insérés dans le flux poussent le contenu vers le bas
- Fix : `position: fixed` overlay, animations CSS `transform` (pas `position`)

### INP (Interaction to Next Paint)
- Le clic "Accepter" déclenche le stockage du consentement + la réactivation des scripts → tâches longues sur le main thread
- Classement INP p75 2025 : UserCentrics (26ms), CookiePro (49ms), CookieLaw (58ms)
- Fix : différer la réactivation des scripts via `requestIdleCallback`

---

## 4. Comparatif d'infrastructure

### Option A : Cloudflare Workers + Hono + D1 + Supabase (CHOISI)

**Latence :**
- Widget : <5ms (CDN edge cache)
- Config : <10ms (KV hit), ~90ms (Supabase REST sur cache miss)
- Consent save : ~40-90ms (D1 write)
- Workers : 0 cold start (V8 isolates <5ms vs 200-2000ms pour containers)

**Connexion Supabase depuis Workers :**
1. REST API (PostgREST) : pas de connection pooling, HTTP-based, ~40ms overhead
2. Hyperdrive + PG direct : plus rapide, nécessite `postgres.js` driver

**Coûts :**

| Scale | Workers | KV | D1 | Supabase | Total/mois |
|-------|---------|-----|-----|----------|------------|
| 10K consents | $5 incl. | $0 | $0 | $0 free | ~$5 |
| 100K consents | $5 | $0 | $0 | $25 pro | ~$30 |
| 1M consents | $5+$14 | ~$2 | ~$1 | $25+ | ~$50 |

### Option B : Hetzner VPS (rejeté)

- Moins cher ($4-17/mois) mais single region EU
- Latence 150-300ms hors Europe
- Ops overhead : backups, updates, monitoring, sécurité
- Pas d'auto-scaling

### Option C : Vercel Edge + Neon/Supabase (rejeté)

- Cold starts Neon : 100-500ms, jusqu'à 3s après inactivité
- Connection pooling problématique avec Supabase Supavisor + Vercel Fluid
- Plus cher à l'échelle ($100-200/mois à 1M consents)

### Option D : Cloudflare D1 pour tout (considéré, intégré)

- D1 excellent pour les reads (replicas globales)
- Adéquat pour les writes (modérés pour un CMP)
- Pattern database-per-tenant idéal pour D1
- 10 GB limit par DB = OK (1M consents × 500 bytes = ~500 MB)

---

## 5. Analyse des CMPs open-source

### orestbida/cookieconsent (MEILLEURE BASE D'INSPIRATION)

| Attribut | Détail |
|----------|--------|
| GitHub | [orestbida/cookieconsent](https://github.com/orestbida/cookieconsent) |
| Licence | MIT |
| Taille | **~5 KB gzip** (JS seul, CSS séparé) |
| Stars | 5.3K |
| TypeScript | Oui (définitions incluses) |
| Version | v3.1.0 |

**Architecture** : Vanilla JS, builds modulaires Rollup. Consent par catégorie avec modes opt-in (GDPR) et opt-out (CCPA).

**Features** : Google Consent Mode v2 intégré, IframeManager (plugin séparé), multi-layouts, ARIA/keyboard accessible, API complète.

**Pourquoi on s'en inspire (sans forker)** :
- 5KB gzip prouve que c'est faisable
- GCM v2 déjà implémenté
- Architecture propre et modulaire
- On construit le nôtre en Shadow DOM (pas dans orestbida) pour l'isolation multi-tenant

### tarteaucitron.js

| Attribut | Détail |
|----------|--------|
| Licence | MIT |
| Taille | ~30-40 KB |
| Stars | ~2.8K |
| TypeScript | Non |

80+ intégrations services pré-construites. Code legacy sans tooling moderne. Pas de base pour un produit commercial.

### Klaro

| Attribut | Détail |
|----------|--------|
| Licence | BSD-3-Clause |
| Taille | 57 KB gzip |
| Stars | ~1.4K |

Config-driven, 17 langues, variante headless disponible. Pas de GCM v2 ni TCF.

### Orejime (fork de Klaro)

| Attribut | Détail |
|----------|--------|
| Licence | MIT |
| Stars | 182 |

Accessibility-first (WCAG/RGAA). Utilisé par l'APD belge et service-public.fr. Bonne référence pour les patterns d'accessibilité.

---

## 6. Cookie Scanner

### Architecture

```
[Dashboard] → [Queue Redis/BullMQ] → [Worker Hetzner]
                                           │
                                    [Playwright Chromium]
                                           │
                                    ├── Crawl sitemap.xml
                                    ├── Intercept Set-Cookie headers
                                    ├── Proxy document.cookie setter
                                    ├── Lire localStorage/sessionStorage
                                    ├── Capturer domaines 3rd-party
                                    ├── Monitor navigator.sendBeacon()
                                    │
                                    └── Catégoriser via cookiedatabase.org
                                           │
                                    [Résultats → Supabase]
```

**Pourquoi server-side obligatoire :**
- JS client ne peut pas énumérer les cookies HTTP-only
- Pas d'accès aux headers `Set-Cookie` des réponses
- Pas de détection des cookies d'iframes cross-origin
- Pas de crawl multi-pages

**Capacité** : Hetzner CX32 (8€/mois) → 2-3 instances Playwright, ~100 sites/heure

**Fréquence** : Initial à l'onboarding, mensuel auto, on-demand depuis le dashboard

---

## 7. Stratégie CDN et versioning

### URLs

```
https://cdn.[produit].com/v1/c.js           ← Major version (non-breaking updates auto)
https://cdn.[produit].com/v1/c.min.js       ← Minifié
https://cdn.[produit].com/v1.2.3/c.js       ← Version exacte (pour contrôle agences)
https://cdn.[produit].com/v1/c.a1b2c3.js    ← Content-hashed (pour SRI)
```

### Cache headers

```
# Major version (v1/c.js) :
Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800

# Version exacte (v1.2.3/c.js) :
Cache-Control: public, max-age=31536000, immutable
```

### SRI (Subresource Integrity)

```html
<script src="https://cdn.[produit].com/v1.2.3/c.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY..."
        crossorigin="anonymous"></script>
```

Requires CORS header `Access-Control-Allow-Origin: *` sur le CDN.

### Invalidation

- Major version : Cloudflare purge API au deploy + `stale-while-revalidate`
- Version exacte : jamais invalidée (new version = new URL)
- Config : KV TTL 60s, propagation globale automatique

---

## 8. Shadow DOM — Justification

### Avantages pour un CMP multi-tenant

- **Encapsulation CSS** : le CSS du site hôte ne peut pas casser le banner
- **Isolation JS** : le JS du site ne peut pas interférer avec le comportement du banner
- **Rendu cohérent** : le widget est identique sur tous les sites clients
- **Sécurité** : empêche la falsification intentionnelle de l'UI de consentement

### Inconvénients

- Certains screen readers et outils d'automatisation (Playwright, Puppeteer) ont des difficultés avec Shadow DOM
- Debugging légèrement plus complexe
- Certains crawlers anciens ne traitent pas le contenu Shadow DOM

### Notre choix

Shadow DOM `mode: "open"` — isolation CSS tout en restant accessible aux DevTools et outils modernes. Axeptio utilise Shadow DOM ; Porsche aussi pour son cookie-consent-banner.

---

## Sources

- [CMP Performance Comparison — Agence Web Performance](https://agencewebperformance.fr/en/cmp-web-performance-comparison/)
- [Cookie Banner Performance — DebugBear](https://www.debugbear.com/blog/cookie-consent-banner-performance)
- [CMP Impact CWV — SpeedCurve](https://www.speedcurve.com/blog/web-performance-cookie-consent/)
- [Auto-blocking — consentmanager](https://help.consentmanager.net/books/cmp/page/automatic-blocking-of-codes-and-cookies)
- [orestbida/cookieconsent](https://github.com/orestbida/cookieconsent)
- [tarteaucitron.js](https://github.com/AmauriC/tarteaucitron.js)
- [kiprotect/klaro](https://github.com/kiprotect/klaro)
- [empreinte-digitale/orejime](https://github.com/empreinte-digitale/orejime)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare D1](https://blog.cloudflare.com/d1-turning-it-up-to-11/)
- [Hono + Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
- [Shadow DOM — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
