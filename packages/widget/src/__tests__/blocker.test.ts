import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ScriptBlocker } from '../blocker'

function createBlockedScript(category: string, src: string): HTMLScriptElement {
  const script = document.createElement('script')
  script.type = 'text/plain'
  script.setAttribute('data-consent', category)
  script.setAttribute('data-src', src)
  return script
}

function createNormalScript(src: string): HTMLScriptElement {
  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.setAttribute('src', src)
  return script
}

function createBlockedIframe(category: string, src: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('data-consent', category)
  iframe.setAttribute('data-src', src)
  iframe.src = 'about:blank'
  return iframe
}

describe('ScriptBlocker', () => {
  let blocker: ScriptBlocker

  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    blocker = new ScriptBlocker()
  })

  it('finds all blocked scripts', () => {
    document.body.appendChild(createBlockedScript('analytics', 'https://example.com/analytics.js'))
    document.body.appendChild(createBlockedScript('marketing', 'https://example.com/ads.js'))
    document.body.appendChild(createNormalScript('https://example.com/normal.js'))

    const blocked = blocker.getBlockedElements()
    expect(blocked).toHaveLength(2)
  })

  it('activates scripts for a given category', () => {
    document.body.appendChild(createBlockedScript('analytics', 'https://example.com/analytics.js'))
    document.body.appendChild(createBlockedScript('marketing', 'https://example.com/ads.js'))

    blocker.activateCategory('analytics')

    const marketingScript = document.querySelector('[data-consent="marketing"][type="text/plain"]')
    expect(document.querySelectorAll('[data-consent="analytics"][type="text/plain"]')).toHaveLength(0)
    expect(marketingScript?.getAttribute('type')).toBe('text/plain')
  })

  it('handles blocked iframes', () => {
    document.body.appendChild(createBlockedIframe('functional', 'https://youtube.com/embed/123'))

    blocker.activateCategory('functional')

    const iframe = document.querySelector('iframe')
    expect(iframe?.src).toContain('youtube.com')
  })

  it('deactivates scripts when consent is revoked', () => {
    document.body.appendChild(createBlockedScript('analytics', 'https://example.com/analytics.js'))

    blocker.activateCategory('analytics')
    expect(document.querySelectorAll('[data-consent="analytics"][type="text/plain"]')).toHaveLength(0)

    blocker.deactivateCategory('analytics')
    expect(document.querySelectorAll('[data-consent="analytics"][type="text/plain"]')).toHaveLength(1)
  })
})
