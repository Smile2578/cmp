import { Hono } from 'hono'
import type { Env } from '../types'

const config = new Hono<{ Bindings: Env }>()

config.get('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')

  const cached = await c.env.CONFIG_CACHE.get(`config:${siteId}`, 'json')
  if (cached) {
    return c.json(cached)
  }

  return c.json({ error: 'Site not found' }, 404)
})

export { config }
