import { describe, expect, it } from 'vitest'
import { createApp } from './app.ts'

describe('GET /api/health', () => {
  it('reports the chains that have a deployment', async () => {
    const res = await createApp().request('/api/health')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; chains: number[] }
    expect(body.ok).toBe(true)
    expect(body.chains).toContain(31337)
  })

  it('returns 404 for unknown routes', async () => {
    const res = await createApp().request('/api/nope')
    expect(res.status).toBe(404)
  })
})
