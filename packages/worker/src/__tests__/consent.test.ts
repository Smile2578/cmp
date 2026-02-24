import { describe, it, expect, beforeAll } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { setup } from './setup'
import app from '../index'

beforeAll(async () => {
  await setup()
})

describe('POST /api/consent', () => {
  it('saves a consent record and returns 201', async () => {
    const payload = {
      visitor_id: 'v_test123',
      categories: {
        essential: true,
        analytics: true,
        marketing: false,
        functional: true
      },
      widget_version: '1.0.0'
    }

    const request = new Request('http://localhost/api/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.42',
        'User-Agent': 'TestBrowser/1.0'
      },
      body: JSON.stringify(payload)
    })

    const ctx = createExecutionContext()
    const response = await app.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(201)
    const body = await response.json() as { id: string; proof_token: string; expires_at: string }
    expect(body.id).toBeTruthy()
    expect(body.proof_token).toBeTruthy()
    expect(body.expires_at).toBeTruthy()
  })

  it('returns 400 for missing visitor_id', async () => {
    const request = new Request('http://localhost/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: { essential: true } })
    })

    const ctx = createExecutionContext()
    const response = await app.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(400)
  })

  it('truncates IP address to /24', async () => {
    const payload = {
      visitor_id: 'v_iptest',
      categories: { essential: true, analytics: false, marketing: false, functional: false },
      widget_version: '1.0.0'
    }

    const request = new Request('http://localhost/api/consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.42'
      },
      body: JSON.stringify(payload)
    })

    const ctx = createExecutionContext()
    const response = await app.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(201)

    const result = await env.DB.prepare(
      'SELECT ip_truncated FROM consents WHERE visitor_id = ?'
    ).bind('v_iptest').first()

    expect(result?.ip_truncated).toBe('203.0.113.0/24')
  })
})

describe('GET /api/consent/:visitorId', () => {
  it('returns the latest consent for a visitor', async () => {
    const payload = {
      visitor_id: 'v_lookup',
      categories: { essential: true, analytics: true, marketing: false, functional: false },
      widget_version: '1.0.0'
    }

    const postReq = new Request('http://localhost/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const ctx1 = createExecutionContext()
    await app.fetch(postReq, env, ctx1)
    await waitOnExecutionContext(ctx1)

    const getReq = new Request('http://localhost/api/consent/v_lookup')
    const ctx2 = createExecutionContext()
    const response = await app.fetch(getReq, env, ctx2)
    await waitOnExecutionContext(ctx2)

    expect(response.status).toBe(200)
    const body = await response.json() as { categories: Record<string, boolean>; expires_at: string }
    expect(body.categories).toEqual({
      essential: true,
      analytics: true,
      marketing: false,
      functional: false
    })
  })

  it('returns 404 for unknown visitor', async () => {
    const request = new Request('http://localhost/api/consent/v_nonexistent')
    const ctx = createExecutionContext()
    const response = await app.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(404)
  })
})
