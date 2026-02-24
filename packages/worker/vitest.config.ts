import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          d1Databases: {
            DB: {
              id: 'test-db'
            }
          },
          kvNamespaces: {
            CONFIG_CACHE: {
              id: 'test-kv'
            }
          },
          bindings: {
            PROOF_SECRET: 'test-secret'
          }
        }
      }
    }
  }
})
