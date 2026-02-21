import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { signup, login } from '../../src/services/auth.service';

// Use unique emails per test to avoid D1 unique constraint errors.
// singleWorker: true means D1 persists between tests in the same run.
function uniqueEmail(): string {
  return `auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('signup', () => {
  it('creates a user and returns a user object with the given email', async () => {
    const email = uniqueEmail();
    const { user, sessionId } = await signup(env, email, 'password123');
    expect(user.email).toBe(email);
    expect(user.id).toBeTruthy();
    expect(sessionId).toBeTruthy();
  });

  it('returned user object does not include password_hash', async () => {
    const email = uniqueEmail();
    const { user } = await signup(env, email, 'password123');
    // The user type should not have password_hash exposed
    expect((user as any).password_hash).toBeUndefined();
  });

  it('session ID is a valid UUID string', async () => {
    const email = uniqueEmail();
    const { sessionId } = await signup(env, email, 'password123');
    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('throws an error when signing up with a duplicate email', async () => {
    const email = uniqueEmail();
    await signup(env, email, 'password123');
    await expect(signup(env, email, 'password456')).rejects.toThrow(
      'Email already registered'
    );
  });
});

describe('login', () => {
  it('returns user and sessionId for valid credentials', async () => {
    const email = uniqueEmail();
    await signup(env, email, 'password123');

    const { user, sessionId } = await login(env, email, 'password123');
    expect(user.email).toBe(email);
    expect(sessionId).toBeTruthy();
  });

  it('returns a new session ID on each login (not reusing the signup session)', async () => {
    const email = uniqueEmail();
    const { sessionId: signupSession } = await signup(env, email, 'hunter2');
    const { sessionId: loginSession } = await login(env, email, 'hunter2');
    expect(loginSession).toBeTruthy();
    // Sessions are random UUIDs — they won't be the same
    expect(loginSession).not.toBe(signupSession);
  });

  it('throws for a wrong password', async () => {
    const email = uniqueEmail();
    await signup(env, email, 'correctpassword');
    await expect(login(env, email, 'wrongpassword')).rejects.toThrow(
      'Invalid credentials'
    );
  });

  it('throws for an email that does not exist', async () => {
    await expect(
      login(env, 'nobody@example.com', 'password')
    ).rejects.toThrow('Invalid credentials');
  });

  it('returned login user object does not include password_hash', async () => {
    const email = uniqueEmail();
    await signup(env, email, 'password123');
    const { user } = await login(env, email, 'password123');
    expect((user as any).password_hash).toBeUndefined();
  });
});
