import { describe, expect, it } from 'vitest'
import { RouteParams } from './routes.schema.js'

describe('routes schema', () => {
  it('validates route params', () => {
    expect(
      RouteParams.safeParse({ routeId: '550e8400-e29b-41d4-a716-446655440000' })
        .success,
    ).toBe(true)
  })
})
