import { describe, expect, it } from 'vitest';
import { TripParams } from './trips.schema.js';

describe('trips schema', () => {
  it('validates trip params', () => {
    expect(TripParams.safeParse({ tripId: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
  });
});
