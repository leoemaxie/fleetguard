import { describe, expect, it } from 'vitest';
import { CreateVehicleSchema } from './vehicles.schema.js';

describe('vehicles schema', () => {
  it('validates create payload', () => {
    const parsed = CreateVehicleSchema.safeParse({
      plateNumber: 'LSD-123-AA',
      make: 'Toyota',
      model: 'Hilux',
      year: 2021,
      fuelTankCapacityLitres: 80,
      status: 'active'
    });
    expect(parsed.success).toBe(true);
  });
});
