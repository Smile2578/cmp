import { Hono } from 'hono'
import type { Env } from '../types'
import { DOGFOOD_CONFIGS } from '../seed/configs'

const config = new Hono<{ Bindings: Env }>()

config.get('/:siteId', async (c) => {
  const siteId = c.req.param('siteId')

  // Check KV cache first
  const cached = await c.env.CONFIG_CACHE.get(`config:${siteId}`, 'json')
  if (cached) {
    return c.json(cached)
  }

  // Fallback to hardcoded dogfood configs
  const dogfoodConfig = DOGFOOD_CONFIGS[siteId]
  if (dogfoodConfig) {
    // Cache in KV for 60s
    await c.env.CONFIG_CACHE.put(
      `config:${siteId}`,
      JSON.stringify(dogfoodConfig),
      { expirationTtl: 60 }
    )
    return c.json(dogfoodConfig)
  }

  return c.json({ error: 'Site not found' }, 404)
})

export { config }
