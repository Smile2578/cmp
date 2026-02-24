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
        label_fr: "Mesure d'audience",
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
      colors: { primary: '#4a7c59', background: '#ffffff', text: '#333333' },
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
        label_fr: "Mesure d'audience",
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
      colors: { primary: '#c1440e', background: '#ffffff', text: '#334155' },
      texts: {
        title: 'Gestion des cookies',
        description: 'Nous utilisons des cookies pour améliorer votre expérience sur anaba.io et mesurer notre audience.'
      },
      logo_url: null
    }
  }
}
