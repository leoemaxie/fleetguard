import { describe, expect, it } from 'vitest';
import { TenantParams } from './tenants.schema.js';

describe('tenants schema', () => {
  it('validates tenant params', () => {
    const parsed = TenantParams.safeParse({ tenantId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(parsed.success).toBe(true);
  });
});
