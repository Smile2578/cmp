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

    const acceptStyle = acceptBtn.getAttribute('class')
    const rejectStyle = rejectBtn.getAttribute('class')
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
    mountWidget({
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
