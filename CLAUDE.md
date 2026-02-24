# CMP — Consent Management Platform

> Code name: "cmp" (nom définitif à choisir)
> Status: Design validé, en attente d'implémentation

---

## Description

SaaS français de gestion du consentement cookies. Alternative à Axeptio à 1/5 du prix, ciblant les agences web françaises gérant 10-50 sites clients.

## Stack

| Composant | Techno |
|-----------|--------|
| Widget JS | Vanilla TypeScript, Shadow DOM, ~10-15KB gzip |
| API edge | Cloudflare Workers + Hono |
| CDN | Cloudflare (natif, 300+ PoP) |
| Config cache | Cloudflare KV (TTL 60s) |
| Consent storage | Cloudflare D1 (SQLite edge, 1 DB par site) |
| Dashboard DB | Supabase Postgres |
| Dashboard | Next.js + Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth |
| Cookie scanner | Playwright sur Hetzner VPS |
| Déploiement dashboard | Vercel |

## Structure prévue

```
cmp/
├── CLAUDE.md              # Ce fichier
├── docs/
│   └── plans/
│       ├── 2026-02-24-cmp-design.md    # Design principal
│       ├── 2026-02-24-cmp-legal.md     # Recherche légale
│       ├── 2026-02-24-cmp-technical.md # Recherche technique
│       └── 2026-02-24-cmp-market.md    # Recherche marché
├── packages/
│   ├── widget/            # Widget JS (vanilla TS, Rollup)
│   └── worker/            # Cloudflare Workers API (Hono)
├── apps/
│   └── dashboard/         # Next.js dashboard admin
└── services/
    └── scanner/           # Cookie scanner (Playwright)
```

## Commandes

```bash
# À définir lors de l'implémentation
```

## Conformité

- RGPD/CNIL (délibérations 2020-091/092)
- Google Consent Mode v2
- IAB TCF v2.3 (phase ultérieure, si nécessaire)

## Dogfood order

1. cveuro.com + anaba.io
2. geds.fr + hippocrate.io

## Documents de référence

- `docs/plans/2026-02-24-cmp-design.md` — Design complet validé
- `docs/plans/2026-02-24-cmp-legal.md` — Exigences légales CNIL/RGPD/ePrivacy/GCMv2/TCF
- `docs/plans/2026-02-24-cmp-technical.md` — Recherche technique (infra, widgets, scanner)
- `docs/plans/2026-02-24-cmp-market.md` — Recherche marché (concurrents, pricing, distribution)

## Règles spécifiques au projet

### Widget
- DOIT peser <15KB gzippé (JS + CSS)
- DOIT utiliser Shadow DOM (mode: "open")
- DOIT bloquer les scripts avant consentement (`type="text/plain"`)
- DOIT implémenter Google Consent Mode v2
- DOIT être async (pas de render-blocking)
- NE DOIT PAS exposer de clés de base de données

### API
- DOIT tourner sur Cloudflare Workers (pas de cold starts)
- DOIT utiliser Hono comme framework
- DOIT rate-limiter via Cloudflare WAF
- DOIT cacher les configs dans KV (TTL 60s)

### Conformité CNIL
- "Tout refuser" DOIT avoir la même proéminence que "Accepter"
- Les IP DOIVENT être tronquées (pas hashées)
- Les consentements DOIVENT expirer après 13 mois max
- Les données DOIVENT être purgées après 25 mois max
- La preuve de consentement DOIT inclure : timestamp, choix, IP tronquée, version widget, user-agent

### Performance
- Widget : 0 impact sur LCP
- Banner : position: fixed (pas de CLS)
- Consent save : defer script activation via requestIdleCallback

## Leçons apprises

_(à remplir au fil du développement)_
