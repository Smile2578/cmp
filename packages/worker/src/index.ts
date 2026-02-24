import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { consent } from './routes/consent'
import { config } from './routes/config'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400
}))

app.route('/api/consent', consent)
app.route('/api/config', config)

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
