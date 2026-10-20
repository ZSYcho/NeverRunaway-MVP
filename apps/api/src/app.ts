import { getDeployment, knownChains } from '@neverrunaway/shared'
import { Hono } from 'hono'

/** Builds the HTTP app. Kept apart from the server entry so tests can call it in-process. */
export function createApp() {
  const app = new Hono().basePath('/api')

  app.get('/health', (c) =>
    c.json({
      ok: true,
      chains: knownChains.filter((chain) => getDeployment(chain.id)).map((chain) => chain.id),
    }),
  )

  return app
}
