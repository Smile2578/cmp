import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import type { Env, ConsentPayload } from '../types'

const consent = new Hono<{ Bindings: Env }>()

function truncateIp(ip: string | null): string | null {
  if (!ip) return null
  
  // Handle IPv4-mapped IPv6 (::ffff:192.168.1.42)
  const v4Mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (v4Mapped) {
    const parts = v4Mapped[1].split('.')
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
  }
  
  // IPv4
  const v4Parts = ip.split('.')
  if (v4Parts.length === 4 && v4Parts.every(p => /^\d+$/.test(p))) {
    return `${v4Parts[0]}.${v4Parts[1]}.${v4Parts[2]}.0/24`
  }
  
  // IPv6: keep first 3 groups (/48), zero the rest (CNIL recommendation)
  const expanded = expandIPv6(ip)
  if (expanded) {
    const groups = expanded.split(':')
    return `${groups[0]}:${groups[1]}:${groups[2]}::/48`
  }
  
  return null
}

function expandIPv6(ip: string): string | null {
  // Remove zone ID if present
  const clean = ip.replace(/%.*$/, '')
  
  const parts = clean.split(':')
  if (parts.length < 3 || parts.length > 8) return null
  
  // Handle :: expansion
  const doubleColonIndex = clean.indexOf('::')
  if (doubleColonIndex !== -1) {
    const before = clean.slice(0, doubleColonIndex).split(':').filter(Boolean)
    const after = clean.slice(doubleColonIndex + 2).split(':').filter(Boolean)
    const missing = 8 - before.length - after.length
    if (missing < 0) return null
    const expanded = [...before, ...Array(missing).fill('0000'), ...after]
    return expanded.map(g => g.padStart(4, '0')).join(':')
  }
  
  if (parts.length !== 8) return null
  return parts.map(g => g.padStart(4, '0')).join(':')
}

function addMonths(date: Date, months: number): string {
  const result = new Date(date.getTime())
  result.setMonth(result.getMonth() + months)
  return result.toISOString()
}

async function generateProofToken(
  visitorId: string,
  categories: string,
  givenAt: string,
  secret: string
): Promise<string> {
  const data = `${visitorId}:${categories}:${givenAt}:${secret}`
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

consent.post('/', async (c) => {
  const body = await c.req.json<ConsentPayload>().catch(() => null)

  if (!body?.visitor_id || !body?.site_id || !body?.categories || !body?.widget_version) {
    return c.json({ error: 'Missing required fields: visitor_id, site_id, categories, widget_version' }, 400)
  }

  const id = nanoid()
  const givenAt = new Date().toISOString()
  const expiresAt = addMonths(new Date(), 13)
  const purgeAfter = addMonths(new Date(), 25)
  const categoriesJson = JSON.stringify(body.categories)
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? null
  const userAgent = c.req.header('User-Agent') ?? null
  const secret = c.env.PROOF_SECRET ?? 'dev-secret'

  const proofToken = await generateProofToken(body.visitor_id, categoriesJson, givenAt, secret)

  await c.env.DB.prepare(`
    INSERT INTO consents (id, site_id, visitor_id, categories, ip_truncated, user_agent, given_at, expires_at, proof_token, widget_version, purge_after)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.site_id,
    body.visitor_id,
    categoriesJson,
    truncateIp(ip),
    userAgent,
    givenAt,
    expiresAt,
    proofToken,
    body.widget_version,
    purgeAfter
  ).run()

  return c.json({ id, proof_token: proofToken, expires_at: expiresAt }, 201)
})

consent.get('/:visitorId', async (c) => {
  const visitorId = c.req.param('visitorId')
  const siteId = c.req.query('site_id')

  let result
  if (siteId) {
    result = await c.env.DB.prepare(
      'SELECT categories, given_at, expires_at, proof_token FROM consents WHERE visitor_id = ? AND site_id = ? ORDER BY given_at DESC LIMIT 1'
    ).bind(visitorId, siteId).first()
  } else {
    result = await c.env.DB.prepare(
      'SELECT categories, given_at, expires_at, proof_token FROM consents WHERE visitor_id = ? ORDER BY given_at DESC LIMIT 1'
    ).bind(visitorId).first()
  }

  if (!result) {
    return c.json({ error: 'No consent found' }, 404)
  }

  return c.json({
    categories: JSON.parse(result.categories as string),
    given_at: result.given_at,
    expires_at: result.expires_at,
    proof_token: result.proof_token
  })
})

export { consent }
