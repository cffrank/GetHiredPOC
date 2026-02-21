import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isLegacyHash } from '../../src/utils/password';

describe('hashPassword', () => {
  it('produces a PBKDF2 hash with the expected format', async () => {
    const hash = await hashPassword('mypassword');
    expect(hash).toMatch(/^pbkdf2:100000:/);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const hash1 = await hashPassword('mypassword');
    const hash2 = await hashPassword('mypassword');
    expect(hash1).not.toBe(hash2);
  });

  it('hash has 4 colon-separated parts', async () => {
    const hash = await hashPassword('mypassword');
    const parts = hash.split(':');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('pbkdf2');
    expect(parts[1]).toBe('100000');
    expect(parts[2]).toHaveLength(32); // 16 bytes = 32 hex chars (salt)
    expect(parts[3]).toHaveLength(64); // 32 bytes = 64 hex chars (hash)
  });
});

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('mypassword');
    expect(await verifyPassword('mypassword', hash)).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const hash = await hashPassword('mypassword');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('returns false for an empty string against a valid hash', async () => {
    const hash = await hashPassword('mypassword');
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('returns false for an unknown hash format', async () => {
    expect(await verifyPassword('password', 'unknown:format')).toBe(false);
  });

  it('returns false for a malformed pbkdf2 hash (wrong number of parts)', async () => {
    expect(await verifyPassword('password', 'pbkdf2:100000:onlytwocolons')).toBe(false);
  });
});

describe('isLegacyHash', () => {
  it('returns true for a $2b$ bcrypt hash', () => {
    expect(isLegacyHash('$2b$10$somehashedvalue')).toBe(true);
  });

  it('returns true for a $2a$ bcrypt hash', () => {
    expect(isLegacyHash('$2a$10$somehashedvalue')).toBe(true);
  });

  it('returns false for a PBKDF2 hash', () => {
    expect(isLegacyHash('pbkdf2:100000:aabb:ccdd')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isLegacyHash('')).toBe(false);
  });

  it('returns false for an arbitrary string', () => {
    expect(isLegacyHash('notahash')).toBe(false);
  });
});
