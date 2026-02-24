# CMP — Recherche marché complète

> Date: 2026-02-24
> Source: Recherche approfondie pricing pages, G2, Capterra, Trustpilot, ProductHunt

---

## 1. Axeptio — Deep Dive

### Profil

- **Fondée** : 2016, Montpellier, France
- **Équipe** : ~13 employés
- **CA estimé** : ~$1.9M
- **Funding** : $3.91M total ($3.84M Seed mai 2023 — Kima Ventures, EVOLEM, ISAI)
- **Clients** : 80 000+ sites (Opéra de Paris, Veepee, Netatmo, Gites de France)

### Pricing actuel (par domaine, par mois)

| Plan | Mensuel | Annuel (~-10%) | Pageviews/mois | Domaines |
|------|---------|----------------|----------------|----------|
| Free | 0€ | 0€ | 200 visiteurs | 1 |
| Small | 29€ | ~26€/mois | 5 000 | 1 |
| Medium | 69€ | ~62€/mois | 100 000 | 1 |
| Large | 129€ | ~116€/mois | 500 000 | 1 + sous-domaines |
| Enterprise | Custom | Custom | Illimité | Illimité |
| Agency | Custom | Custom | Custom | Illimité, white-label |

### Ce qui les rend chers

- Pricing par domaine (chaque site client = abonnement séparé)
- Scaling par pageviews (dépassement → upgrade forcé)
- Les bots comptent dans les quotas
- Pas de pricing agence transparent (contact sales obligatoire)
- Augmentations de prix sans préavis

### Plaintes utilisateurs (G2, Trustpilot, Capterra)

1. **Augmentations de prix sans préavis** — plainte récurrente
2. **Documentation insuffisante** pour GTM / Consent V2
3. **Pas de configuration globale** — migration Consent V2 "complexe et chronophage"
4. **Admin UI vieillissante** — difficultés de navigation
5. **Pop-up fréquent en plan gratuit**
6. **Support téléphonique difficile à joindre**
7. **Cher pour les agences multi-sites**

### Points forts

- Google CMP Partner Gold
- IAB TCF v2.2/v2.3
- UX fun/illustrée (différenciateur de marque)
- Mobile SDKs (Swift, Kotlin, Flutter, React Native)
- 8 plugins CMS

### Point faible critique

**Axeptio NE bloque PAS automatiquement les cookies.** Il repose sur l'intégration GTM. → Opportunité de différenciation majeure pour nous.

---

## 2. Concurrents principaux

### Didomi (français, enterprise)

| Aspect | Détail |
|--------|--------|
| Cible | Enterprise (L'Equipe, Michelin, El Mundo) |
| Pricing | Custom uniquement, pas de plan public |
| Modèle | Monthly Unique Visitors (MUV), domaines illimités |
| Forces | Feature set riche, expertise CNIL, multi-plateforme |
| Faiblesses | Pas de transparence prix, enterprise-only |
| Fit agences | Mauvais — trop cher et complexe |

### Cookiebot (par Usercentrics, danois)

| Aspect | Détail |
|--------|--------|
| Pricing | Par domaine, basé sur les sous-pages |
| Free | Oui, jusqu'à 50 sous-pages |
| Small (4+ domaines) | 15€/mois/domaine |
| Medium | ~30€/domaine |
| Extra Large | 90€/domaine (7 000+ sous-pages) |
| Forces | Scan auto cookies (breveté), auto-blocking, bon plugin WP |
| Faiblesses | Prix monte avec les sous-pages (upgrades auto), par-domaine |
| Fit agences | Moyen — discount volume pour 4+ domaines mais reste cher |

### CookieYes (budget)

| Aspect | Détail |
|--------|--------|
| Free | 5 000 PV/mois, 1 domaine |
| Basic | 10€/mois/domaine (100K PV) |
| Pro | 25€/mois/domaine (300K PV) |
| Ultimate | 55€/mois/domaine (illimité) |
| Programme agence | Jusqu'à 50% de réduction partenaire |
| Forces | Abordable, fort programme agence, bon free tier |
| Faiblesses | Par-domaine, branding uniquement supprimé en Ultimate (55€) |
| Fit agences | Fort — 50% discount = 5€/domaine, dashboard centralisé |

### iubenda (italien)

| Aspect | Détail |
|--------|--------|
| Starter | 3.99€/mois/site |
| Essentials | 6.99€/mois (25K PV) |
| Advanced | 27.99€/mois (150K PV) |
| Ultimate | 99.99€/mois |
| Consent DB | 5€ par 1 000 consentements stockés |
| Forces | Très abordable en entrée, all-in-one (privacy policy + consent + T&C) |
| Faiblesses | Surcharges consentements, personnalisation limitée |
| Fit agences | Correct en entrée, mais imprévisible à l'échelle |

### Complianz (WordPress)

| Aspect | Détail |
|--------|--------|
| Personal | 59€/an pour 1 site |
| Professional | 179€/an pour 5 sites |
| Agency | 399€/an pour 25 sites |
| Modèle | Forfait, pageviews et consentements illimités |
| Forces | Pas de limites PV, très abordable, A/B testing |
| Faiblesses | WordPress only |
| Fit agences WP | Excellent — ~16€/site/an au tier agence |

### Tarteaucitron (open-source français)

| Aspect | Détail |
|--------|--------|
| Free | Script open-source (auto-hébergé) |
| Premium | 190€/an — sites illimités, trafic illimité |
| Users | 81 300 sites actifs, 1.295B consents/mois |
| Forces | Français, open-source, incroyable value, GCM v2 |
| Faiblesses | Technique à intégrer, pas de dashboard SaaS, pas d'auto-scan |
| Fit agences | Bon pour agences techniques, manque le layer SaaS |

### Consentmanager.net (allemand)

| Aspect | Détail |
|--------|--------|
| Free | 1 site, 3K PV/mois |
| Starter | 23€/mois — 1 site, 100K PV |
| Essential | 59€/mois — 3 sites, 1M PV |
| Professional | 219€/mois — 20 sites, 10M PV |
| Forces | Bundles multi-sites, A/B testing, auto-blocking, IAB TCF |
| Faiblesses | Germano-centrique, pas forte présence FR |
| Fit agences | Bon — Pro à 219€/mois pour 20 sites = 11€/site |

---

## 3. Gaps du marché

### Le trou évident

**Aucun CMP français, abordable, SaaS, spécifiquement conçu pour les agences web gérant 10-50 sites.**

| Segment | Acteurs | Problème |
|---------|---------|----------|
| Cher + français | Axeptio, Didomi | Prix prohibitif pour les agences multi-sites |
| Pas cher + étranger | CookieYes, Cookiebot | Pas français, conformité CNIL approximative |
| Open-source + technique | Tarteaucitron, Orejime | Pas de dashboard SaaS, pas d'auto-scan |
| WordPress only | Complianz | Limité à WP |

### Features manquantes dans le marché

1. **CNIL-compliant templates out of the box** (boutons symétriques, pas de dark patterns)
2. **Auto-scan + auto-blocking** (Axeptio ne le fait PAS)
3. **Widget ultra-léger** (<15KB → argument performance/SEO)
4. **Dashboard agence** avec gestion par client et facturation séparée
5. **Pas de limites de pageviews** (ou limites très généreuses)
6. **Intégration one-line** (une balise script, c'est tout)

### Pourquoi les agences quittent Axeptio

- Augmentations de prix sans préavis
- Difficulté à gérer plusieurs sites efficacement
- Manque de transparence sur le pricing volume
- Migration Consent V2 complexe avec documentation insuffisante

---

## 4. Positionnement prix

### Notre grille vs la concurrence (pour 20 sites)

| Platform | Coût mensuel (20 sites) |
|----------|------------------------|
| Axeptio Medium | ~1 380€ |
| Consentmanager Pro | 219€ (bundle) |
| Cookiebot Small (4+) | 300€ |
| CookieYes Basic | 200€ |
| CookieYes (agence -50%) | 100€ |
| Tarteaucitron Premium | ~16€ (forfait annuel) |
| Complianz Agency | ~33€ (forfait annuel, WP only) |
| **Nous (grille dégressive)** | **~300€** |

### Notre grille tarifaire

| Sites | Prix/site/mois | Total 20 sites | vs Axeptio |
|-------|---------------|----------------|------------|
| 1-5 | 20€ | - | -71% |
| 6-15 | 15€ | - | -78% |
| 16-30 | 12€ | ~300€ | -78% |
| 31-50 | 10€ | - | -86% |
| 50+ | 8€ | - | -88% |

### Free tier

- 1 site, 25 000 pageviews/mois
- Badge "Powered by [Produit]"
- Widget complet + consent storage
- Pas de scanner auto

---

## 5. Canaux de distribution

### Prioritaires

1. **Plugin WordPress** — Table stakes, Complianz a 1M+ installs
2. **SEO/Content en français** — "RGPD cookies", "bandeau cookies conforme CNIL" sont sous-servis
3. **Programme partenaire agences** — Discount volume + dashboard multi-clients
4. **Réseau DPO/consultants RGPD** — Les DPO recommandent des CMPs à leurs clients

### Secondaires

5. Google CMP Partner (plus tard, avec TCF)
6. Webflow/Shopify/PrestaShop integrations
7. Events tech français (Paris, Lyon, Bordeaux)

### Intégrations par priorité

| Plateforme | Part de marché (FR) | Priorité |
|------------|---------------------|----------|
| WordPress | ~40% sites agences | **Critique** |
| PrestaShop | E-commerce FR | **Haute** |
| Shopify | En croissance | **Haute** |
| Webflow | Agences premium | **Haute** |
| Next.js / Custom | Agences tech | **Moyenne** |
| Wix | PME | Moyenne |

---

## 6. Référence : CookieFirst

Le modèle à suivre pour un CMP bootstrappé :
- 7 employés
- **$1.5M ARR**
- 5 000 clients
- Pricing simple : 9€/Basic, 19€/Plus
- Programme revendeur avec 30% de réduction

Prouve qu'une petite équipe peut construire un CMP SaaS rentable.

---

## Sources

- [Axeptio Pricing](https://www.axept.io/pricing)
- [Axeptio G2](https://www.g2.com/products/axeptio/reviews)
- [Axeptio Trustpilot](https://www.trustpilot.com/review/axeptio.eu)
- [Didomi Offers](https://www.didomi.io/offers)
- [Cookiebot Pricing](https://www.cookiebot.com/us/pricing/)
- [CookieYes Pricing](https://www.cookieyes.com/pricing/)
- [CookieYes Agency](https://www.cookieyes.com/partners/agency/)
- [iubenda Pricing](https://www.iubenda.com/en/pricing/)
- [Complianz Pricing](https://complianz.io/pricing/)
- [Tarteaucitron.io](https://tarteaucitron.io/en/)
- [Consentmanager Pricing](https://www.consentmanager.net/en/pricing/)
- [CookieFirst Revenue](https://getlatka.com/companies/cookiefirst)
- [CMP Market Comparison 2025](https://secureprivacy.ai/blog/best-consent-management-platforms-in-2025)
