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
