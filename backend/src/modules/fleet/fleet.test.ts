import { describe, expect, it } from 'vitest';
import { FleetResponseSchema } from './fleet.schema.js';

describe('fleet schema', () => {
  it('validates fleet response object', () => {
    const parsed = FleetResponseSchema.safeParse({
      vehicleId: '550e8400-e29b-41d4-a716-446655440000',
      plateNumber: 'AAA-123-BB',
      status: 'active',
      latestTs: new Date().toISOString(),
      speedKph: '32.5',
      fuelLevelPct: '80.4',
      openAlertCount: 0,
      statusColor: 'green'
    });
    expect(parsed.success).toBe(true);
  });
});
