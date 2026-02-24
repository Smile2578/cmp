import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import type { Env, ConsentPayload } from '../types'

const consent = new Hono<{ Bindings: Env }>()

function truncateIp(ip: string | null): string | null {
  if (!ip) return null
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
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

  if (!body?.visitor_id || !body?.categories || !body?.widget_version) {
    return c.json({ error: 'Missing required fields: visitor_id, categories, widget_version' }, 400)
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
    INSERT INTO consents (id, visitor_id, categories, ip_truncated, user_agent, given_at, expires_at, proof_token, widget_version, purge_after)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
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

  const result = await c.env.DB.prepare(
    'SELECT categories, given_at, expires_at, proof_token FROM consents WHERE visitor_id = ? ORDER BY given_at DESC LIMIT 1'
  ).bind(visitorId).first()

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
