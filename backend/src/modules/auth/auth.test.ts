import { describe, expect, it } from 'vitest';
import { RegisterSchema } from './auth.schema.js';

describe('auth schema', () => {
  it('validates register payload', () => {
    const parsed = RegisterSchema.safeParse({
      tenantName: 'Dangote',
      email: 'admin@example.com',
      password: 'password123',
      firstName: 'Ada',
      lastName: 'Okafor'
    });
    expect(parsed.success).toBe(true);
  });
});
