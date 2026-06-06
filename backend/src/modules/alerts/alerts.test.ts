import { describe, expect, it } from 'vitest'
import { AlertParams } from './alerts.schema.js'

describe('alerts schema', () => {
  it('validates alert params', () => {
    expect(
      AlertParams.safeParse({ alertId: '550e8400-e29b-41d4-a716-446655440000' })
        .success,
    ).toBe(true)
  })
})
