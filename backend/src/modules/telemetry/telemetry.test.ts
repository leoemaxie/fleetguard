import { describe, expect, it } from 'vitest'
import { TelemetryParams } from './telemetry.schema.js'

describe('telemetry schema', () => {
  it('validates telemetry params', () => {
    expect(
      TelemetryParams.safeParse({
        vehicleId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true)
  })
})
