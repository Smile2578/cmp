# CMP SaaS — Design Document

> Date: 2026-02-24
> Status: Validé
> Auteur: Simon Belissa + Claude

---

## 1. Vision

Construire un **Consent Management Platform (CMP)** français, léger et abordable, ciblant les agences web qui gèrent 10-50 sites clients. Alternative directe à Axeptio à 1/5 du prix.

### Problème

- Axeptio coûte 69-129€/site/mois → une agence avec 20 sites paie ~1 380€/mois
- Les alternatives pas chères (CookieYes, Cookiebot) ne sont pas françaises et approximent la conformité CNIL
- Tarteaucitron est open-source mais sans dashboard SaaS
- Aucun CMP français abordable n'existe pour les agences

### Solution

Un CMP qui offre :
- Widget ultra-léger (~10-15KB gzip) avec auto-blocking
- Conformité CNIL/RGPD native + Google Consent Mode v2
- Dashboard SaaS multi-sites pour agences
- Cookie scanner automatique
- Prix à 20€/site/mois, dégressif

### Marché cible

1. **Phase 1 (dogfood)** : Nos propres sites — cveuro.com, anaba.io, geds.fr, hippocrate.io
2. **Phase 2 (lancement)** : Agences web françaises (10-50 sites)
3. **Phase 3 (expansion)** : Agences EU, PME en direct

### Référence

CookieFirst : bootstrappé, 7 employés, $1.5M ARR, 5 000 clients. Prouve qu'une petite équipe peut réussir.

---

## 2. Architecture

### Vue d'ensemble

```
Site client (cveuro.com, anaba.io, etc.)
  │
  ├── <script src="https://cdn.[produit].com/v1/c.js"
  │          data-site="site_abc123" async></script>
  │
  ▼
┌────────────────────┐
│  Cloudflare CDN    │  Widget JS (~10-15KB gzip)
│  Cache immutable   │  Versionné : /v1/c.js, /v2/c.js
│  + SRI hash        │
└────────┬───────────┘
         │
┌────────▼────────────────┐
│  Cloudflare Workers     │  API edge (Hono, <5ms cold start)
│                         │
│  GET  /config/:site ────┤──→ KV cache (60s TTL)
│  POST /consent     ────┤──→ D1 (write → primary)
│  GET  /consent/:id ────┤──→ D1 (read → replica)
│                         │
│  Rate limiting (CF WAF) │
└────────┬────────────────┘
         │
  ┌──────┼────────────┐
  ▼      ▼            ▼
┌─────┐ ┌─────┐ ┌──────────┐
│ KV  │ │ D1  │ │ Supabase │
│     │ │     │ │          │
│Site │ │Con- │ │users     │
│conf │ │sents│ │sites     │
│cache│ │(1DB │ │configs   │
│     │ │/site│ │themes    │
└─────┘ └─────┘ │billing   │
                └──────────┘

┌─────────────────────┐  ┌──────────────────┐
│ Dashboard (Vercel)  │  │ Scanner (Hetzner) │
│ Next.js + Tailwind  │  │ Playwright        │
│ + shadcn/ui         │  │ Scan mensuel auto │
│ Auth Supabase       │  │ Catégorisation    │
└─────────────────────┘  └──────────────────┘
```

### Choix technologiques

| Composant | Techno | Justification |
|-----------|--------|---------------|
| API edge | Cloudflare Workers + Hono | 0 cold start, <5ms, 300+ PoP mondial, WAF/DDoS inclus |
| Widget JS | Vanilla TypeScript, Shadow DOM | ~10-15KB gzip, isolation CSS, pas de conflit avec le site hôte |
| CDN | Cloudflare (natif) | Cache immutable, SRI, versioning, 300+ edge locations |
| Config cache | Cloudflare KV | Sub-ms en edge, TTL 60s, propagation globale |
| Consent storage | Cloudflare D1 (SQLite) | Read-replicas globales, DB par tenant, cheap à l'échelle |
| Dashboard DB | Supabase Postgres | Auth, RLS, full SQL, real-time |
| Dashboard | Next.js + Tailwind + shadcn/ui | Stack standard, SSR, déploiement Vercel |
| Cookie scanner | Playwright sur Hetzner VPS | Browser headless nécessaire, ~8€/mois |

### Pourquoi cette architecture et pas une autre

**Rejeté : Widget → Supabase direct**
- Clé anon exposée dans le JS client
- Pas de rate limiting
- Couplage fort à Supabase
- Perception "vibecoded"

**Rejeté : Vercel Edge Functions**
- Cold starts Neon jusqu'à 3s après inactivité
- Connection pooling problématique avec Supabase
- Plus cher à l'échelle

**Rejeté : VPS Hetzner pour tout**
- Latence hors Europe (150-300ms)
- Ops overhead (backups, updates, monitoring)
- Pas d'auto-scaling

**Choisi : Cloudflare Workers + D1 + Supabase**
- 0 cold start partout dans le monde
- D1 réplique les reads globalement
- Supabase pour la partie admin (pas exposé au widget)
- Coût minimal : $5-50/mois selon le scale

---

## 3. Widget — Produit coeur

### Inspiration

[orestbida/cookieconsent](https://github.com/orestbida/cookieconsent) : ~5KB gzip, TypeScript, MIT, GCM v2 intégré, 5.3K stars. On s'en inspire pour l'architecture, on construit le nôtre en Shadow DOM.

### Fonctionnement

1. **Chargement** : Script async, crée un Shadow DOM pour isolation CSS totale
2. **Check consent** : Lit le cookie local `_consent_{siteId}`
   - Si valide et non expiré → applique les choix silencieusement
   - Si absent ou expiré → affiche le banner
3. **Affichage banner** : Conforme CNIL (boutons symétriques, pas de dark patterns)
4. **Blocage scripts** : `type="text/plain" data-consent="category"` + MutationObserver pour scripts dynamiques
5. **Au consentement** :
   - Sauvegarde cookie local (13 mois max)
   - POST vers API edge → D1
   - Déclenche Google Consent Mode v2 (`gtag('consent', 'update', {...})`)
   - Active/bloque les scripts selon les choix
6. **Iframes** : Placeholder avec preview image + message de consentement

### Catégories de cookies (standard CNIL)

| Catégorie | Consentement | Exemples |
|-----------|-------------|----------|
| **Essentiels** | Non (exemptés) | Session, panier, auth, choix consent |
| **Analytics** | Oui | Google Analytics, Plausible, Matomo |
| **Marketing** | Oui | Google Ads, Facebook Pixel, LinkedIn |
| **Fonctionnels** | Oui | Chat live, vidéo embed, fonts externes |

### Mécanisme de blocage

```html
<!-- Scripts bloqués avant consentement -->
<script type="text/plain" data-consent="marketing"
        data-src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>

<!-- Iframes bloquées -->
<iframe data-consent="functional"
        data-src="https://www.youtube.com/embed/VIDEO_ID"
        src="about:blank"></iframe>
```

Le widget :
1. Scanne les éléments `[data-consent]` au chargement
2. Active un MutationObserver sur `document.head` et `document.body` pour les scripts injectés dynamiquement
3. Au consentement : restaure `src` depuis `data-src`, change `type` en `text/javascript`

### Google Consent Mode v2

```javascript
// DÉFAUT — avant consentement (tout bloqué)
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted'  // toujours granted
})

// APRÈS consentement — selon les choix utilisateur
gtag('consent', 'update', {
  ad_storage: consent.marketing ? 'granted' : 'denied',
  ad_user_data: consent.marketing ? 'granted' : 'denied',
  ad_personalization: consent.marketing ? 'granted' : 'denied',
  analytics_storage: consent.analytics ? 'granted' : 'denied',
  functionality_storage: consent.functional ? 'granted' : 'denied',
  personalization_storage: consent.functional ? 'granted' : 'denied'
})
```

### UI du widget

```
┌─────────────────────────────────────────────────┐
│  Ce site utilise des cookies                    │
│                                                 │
│  Nous utilisons des cookies pour améliorer      │
│  votre expérience et mesurer l'audience.        │
│                                                 │
│  [Personnaliser]  [Tout refuser]  [Accepter]    │
└─────────────────────────────────────────────────┘
```

**Conformité CNIL du banner :**
- "Tout refuser" et "Accepter" : même taille, même couleur, même proéminence
- Pas de dark patterns (pas de "Continuer sans accepter" caché)
- "Personnaliser" accessible en 1 clic
- Identité des responsables de traitement accessible
- Lien "Gérer mes cookies" permanent (injecté en footer ou flottant)

---

## 4. Data Model

### Supabase (Dashboard)

```sql
-- Sites enregistrés
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configuration des cookies par site
CREATE TABLE cookie_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('essential', 'analytics', 'marketing', 'functional')),
  cookie_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  description_fr TEXT NOT NULL,
  description_en TEXT,
  duration TEXT NOT NULL,
  is_essential BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Thèmes du widget par site
CREATE TABLE widget_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL UNIQUE,
  position TEXT DEFAULT 'bottom' CHECK (position IN ('bottom', 'top', 'center', 'bottom-left', 'bottom-right')),
  colors JSONB DEFAULT '{"primary": "#000000", "background": "#ffffff", "text": "#333333"}',
  texts JSONB DEFAULT '{}',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Résultats du scanner de cookies
CREATE TABLE scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  cookies_found JSONB NOT NULL,
  pages_scanned INTEGER NOT NULL,
  status TEXT DEFAULT 'completed'
);
```

### Cloudflare D1 (Consents — 1 DB par site)

```sql
-- Table unique par base D1
CREATE TABLE consents (
  id TEXT PRIMARY KEY,           -- nanoid
  visitor_id TEXT NOT NULL,       -- ID anonyme (cookie first-party)
  categories TEXT NOT NULL,       -- JSON: {"essential":true,"analytics":true,...}
  ip_truncated TEXT,              -- IP tronquée (ex: "192.168.1.0/24")
  user_agent TEXT,
  given_at TEXT NOT NULL,         -- ISO 8601
  expires_at TEXT NOT NULL,       -- +13 mois
  proof_token TEXT NOT NULL,      -- SHA-256(visitor_id + categories + given_at + secret)
  widget_version TEXT NOT NULL,
  purge_after TEXT NOT NULL       -- +25 mois (durée max CNIL)
);

CREATE INDEX idx_consents_visitor ON consents(visitor_id);
CREATE INDEX idx_consents_purge ON consents(purge_after);
```

---

## 5. Conformité légale

### Base juridique

- **Article 82** de la Loi Informatique et Libertés (transposition art. 5(3) ePrivacy)
- **Délibération CNIL n°2020-091** (lignes directrices cookies, 17 sept 2020)
- **Délibération CNIL n°2020-092** (recommandation modalités pratiques)
- **RGPD articles 7, 13, 14** (conditions du consentement, information)

### Matrice de conformité

| Exigence CNIL | Implémentation | Vérification |
|---------------|----------------|--------------|
| Consentement préalable | `type="text/plain"` bloque tout avant consent | Test : aucun cookie non-essentiel avant interaction |
| Consentement libre | Pas de cookie wall, accès au site sans consentir | Test : navigation possible sans accepter |
| Consentement spécifique | 4 catégories indépendantes | Test : chaque catégorie cochable individuellement |
| Consentement informé | Description de chaque cookie + finalité + fournisseur + durée | Test : panneau personnalisation complet |
| Consentement univoque | Clic explicite requis (pas de scroll, pas de silence) | Test : aucune action par défaut |
| Refuser = Accepter | Boutons même taille, même couleur, même niveau | Test : comparaison visuelle automatisée |
| Preuve de consentement | D1 : timestamp, choix, IP tronquée, version, user-agent, proof_token | Test : record vérifié après chaque consent |
| Retrait facile | Lien "Gérer mes cookies" permanent | Test : lien toujours visible |
| Durée max 13 mois | `expires_at` = `given_at + 13 mois`, re-demande auto | Test : expiration simulée |
| Données max 25 mois | `purge_after` = `given_at + 25 mois`, cron de purge | Test : purge vérifiée |
| Identité responsables | Liste accessible depuis le panneau | Test : données présentes |
| Cookies exemptés | Catégorie "essentiel" non-décochable, toujours active | Test : toggle désactivé |

### Gestion des IP (RGPD-compliant)

L'IP n'est **pas anonymisable par hash** (espace IPv4 trop petit → attaque dictionnaire).

Options :
1. **Tronquer** : `192.168.1.0/24` (enlever le dernier octet) → notre choix
2. **Ne pas stocker** : plus simple mais moins de valeur pour la preuve
3. **Hacher avec sel** : reste de la donnée personnelle au sens RGPD

### Ce qui nécessite un juriste (avant commercialisation)

1. Rédaction des textes légaux du banner (formulation exacte)
2. CGU/CGV du service SaaS
3. Template de politique de confidentialité pour les clients
4. Responsabilité en cas de contrôle CNIL d'un client
5. Conformité de la preuve de consentement

Estimation : 500-1 000€ one-shot.

### IAB TCF v2.3

**Pas nécessaire au lancement.** Requis uniquement pour :
- Sites avec Google AdSense / Ad Manager
- Publicité programmatique (RTB/SSP)

Nos sites dogfood (GEDS, Hippocrate, cveuro, anaba) font du Google Ads (pas AdSense) → pas besoin.

Certification si nécessaire plus tard : 1 575€/an.

### Sanctions CNIL (contexte)

- 2025 : 486.8M€ de sanctions totales, dont **21 sanctions spécifiques cookies**
- Plus grosses amendes cookies : Google (325M€), Shein (150M€)
- Procédure simplifiée CNIL : max 20 000€ + 100€/jour d'astreinte

---

## 6. Dashboard Admin

### Pages

```
/dashboard
  ├── /sites                        # Liste des sites
  │   └── /sites/[id]              # Config d'un site
  │       ├── /cookies              # Déclarer les cookies par catégorie
  │       ├── /scanner              # Résultats du scan + lancer un scan
  │       ├── /theme                # Personnaliser le widget
  │       ├── /integration          # Snippet + guide d'intégration
  │       ├── /consent-mode         # Config Google Consent Mode v2
  │       └── /analytics            # Stats de consentement
  ├── /consents                     # Journal des preuves
  └── /settings                     # Compte, facturation
```

### Snippet d'intégration (ce que le client copie-colle)

```html
<!-- [Produit] Consent Widget — monsite.fr -->
<script
  src="https://cdn.[produit].com/v1/c.js"
  data-site="site_abc123"
  async
></script>
```

C'est tout. Une seule ligne.

---

## 7. Cookie Scanner

### Architecture

```
[Dashboard: "Lancer un scan"]
        │
        ▼
[API Supabase → Queue Redis/BullMQ]
        │
        ▼
[Worker Hetzner VPS]
  ├── Playwright (Chromium headless)
  ├── Crawl sitemap.xml puis liens internes
  ├── Par page :
  │   ├── Intercepte Set-Cookie headers
  │   ├── Proxy document.cookie setter
  │   ├── Lit localStorage / sessionStorage
  │   ├── Capture domaines 3rd-party (iframes, scripts)
  │   └── Monitor navigator.sendBeacon()
  ├── Catégorisation via cookiedatabase.org
  └── Stockage résultats → Supabase (scan_results)
```

### Fréquence

- **Initial** : Au premier ajout du site
- **Mensuel** : Scan automatique (cron)
- **On-demand** : Bouton dans le dashboard
- **Lightweight** : Beacon client-side hebdomadaire (signale les cookies inconnus)

### Capacité

Un Hetzner CX32 (8€/mois) peut faire tourner 2-3 instances Playwright concurrentes, soit ~100 sites/heure.

---

## 8. Pricing

### Grille tarifaire

| Sites | Prix/site/mois | vs Axeptio Medium (69€) |
|-------|---------------|------------------------|
| 1-5 | 20€ | -71% |
| 6-15 | 15€ | -78% |
| 16-30 | 12€ | -83% |
| 31-50 | 10€ | -86% |
| 50+ | 8€ | -88% |

### Free tier

- 1 site, 25 000 pageviews/mois
- Badge "Powered by [Produit]"
- Widget complet + consent storage
- Pas de scanner auto

### Coûts infrastructure

| Phase | Coût/mois |
|-------|-----------|
| Dogfood (4 sites) | ~5€ |
| SaaS (100 sites, 100K consents) | ~30-50€ |
| Scale (1M consents) | ~50-100€ |

Avec 100 sites × 15€ moyen = 1 500€/mois de revenus. Marge ~97%.

---

## 9. Roadmap

| Phase | Scope | Sites |
|-------|-------|-------|
| **1 — Widget MVP** | Widget JS + API Workers + D1 consent storage + GCM v2 | cveuro.com, anaba.io |
| **2 — Dashboard** | Dashboard Next.js admin, config cookies, thème, snippet | geds.fr, hippocrate.io |
| **3 — Scanner** | Cookie scanner Playwright, auto-catégorisation, scan mensuel | Tous les sites |
| **4 — SaaS** | Multi-tenant, Stripe billing, onboarding, free tier | Agences (beta) |
| **5 — Extensions** | Plugin WordPress, intégrations Webflow/Shopify, TCF v2.3 | Marché ouvert |

---

## 10. Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Non-conformité CNIL | Amende + perte de crédibilité | Tests automatisés de conformité + juriste avant commercialisation |
| Google change les règles Consent Mode | Perte de fonctionnalité | Monitoring des docs Google, architecture découplée |
| Cloudflare D1 limitations | Performance dégradée | Fallback vers Supabase possible, D1 est en GA |
| Concurrence réagit (Axeptio baisse prix) | Perte d'avantage compétitif | Différenciateurs : auto-scan, performance, made in France |
| Shadow DOM incompatibilités | Widget ne s'affiche pas sur certains sites | Fallback mode sans Shadow DOM |

---

## Décisions validées

- [x] Cible : agences web françaises
- [x] Pricing : 20€/site/mois dégressif
- [x] Légal : RGPD/CNIL + Google Consent Mode v2 (pas IAB TCF au lancement)
- [x] Stratégie : dogfood (cveuro, anaba, geds, hippocrate) puis SaaS
- [x] Stack : Cloudflare Workers + Hono + D1 + KV + Supabase + Next.js
- [x] Widget : vanilla TS, Shadow DOM, ~10-15KB gzip, auto-blocking
- [x] Design : minimaliste, pro, personnalisable, pas de branding imposé
- [x] Scanner : Playwright sur Hetzner VPS
- [x] Nom : à déterminer (code name "cmp")
