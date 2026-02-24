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
    ?? "Nous utilisons des cookies pour améliorer votre expérience et mesurer l'audience."

  const titleEl = document.createElement('div')
  titleEl.className = 'cmp-title'
  titleEl.textContent = title

  const descEl = document.createElement('div')
  descEl.className = 'cmp-description'
  descEl.textContent = description

  const actions = document.createElement('div')
  actions.className = 'cmp-actions'

  const customizeBtn = document.createElement('button')
  customizeBtn.className = 'cmp-btn-secondary'
  customizeBtn.setAttribute('data-cmp-customize', '')
  customizeBtn.textContent = 'Personnaliser'
  customizeBtn.addEventListener('click', callbacks.onCustomize)

  const rejectBtn = document.createElement('button')
  rejectBtn.className = 'cmp-btn-primary'
  rejectBtn.setAttribute('data-cmp-reject', '')
  rejectBtn.textContent = 'Tout refuser'
  rejectBtn.addEventListener('click', callbacks.onRejectAll)

  const acceptBtn = document.createElement('button')
  acceptBtn.className = 'cmp-btn-primary'
  acceptBtn.setAttribute('data-cmp-accept', '')
  acceptBtn.textContent = 'Accepter'
  acceptBtn.addEventListener('click', callbacks.onAcceptAll)

  actions.appendChild(customizeBtn)
  actions.appendChild(rejectBtn)
  actions.appendChild(acceptBtn)

  banner.appendChild(titleEl)
  banner.appendChild(descEl)
  banner.appendChild(actions)

  return banner
}
