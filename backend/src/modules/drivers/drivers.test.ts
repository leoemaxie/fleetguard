import { describe, expect, it } from 'vitest'
import { DriverParams } from './drivers.schema.js'

describe('drivers schema', () => {
  it('validates route params', () => {
    const parsed = DriverParams.safeParse({
      driverId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(parsed.success).toBe(true)
  })
})
