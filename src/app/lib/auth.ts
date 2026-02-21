import { hashPassword, verifyPassword, isLegacyHash } from './password';

export { hashPassword, verifyPassword };

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  skills: string | null;
  avatar_url: string | null;
  created_at: number;
  updated_at: number;
}

export async function signup(
  env: Env,
  email: string,
  password: string
): Promise<{ user: User; sessionId: string }> {
  // Check if user already exists
  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const result = await env.DB.prepare(
    "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, full_name, bio, location, skills, avatar_url, created_at, updated_at"
  )
    .bind(email, passwordHash)
    .first<User>();

  if (!result) {
    throw new Error("Failed to create user");
  }

  const sessionId = await createSession(env, result.id);

  return { user: result, sessionId };
}

export async function login(
  env: Env,
  email: string,
  password: string
): Promise<{ user: User; sessionId: string }> {
  const result = await env.DB.prepare(
    "SELECT id, email, password_hash, full_name, bio, location, skills, avatar_url, created_at, updated_at FROM users WHERE email = ?"
  )
    .bind(email)
    .first<User & { password_hash: string }>();

  if (!result) {
    throw new Error("Invalid credentials");
  }

  const isValid = await verifyPassword(password, result.password_hash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Lazy migration: re-hash bcryptjs passwords to PBKDF2 on successful login
  if (isLegacyHash(result.password_hash)) {
    const newHash = await hashPassword(password);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(newHash, result.id)
      .run();
  }

  const sessionId = await createSession(env, result.id);

  // Remove password_hash from returned user
  const { password_hash, ...user } = result;

  return { user, sessionId };
}

export async function createSession(
  env: Env,
  userId: string
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days in seconds

  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  )
    .bind(sessionId, userId, expiresAt)
    .run();

  // Store session in KV with TTL
  await env.KV_SESSIONS.put(sessionId, userId, {
    expirationTtl: 7 * 24 * 60 * 60,
  });

  return sessionId;
}

export async function getSession(
  env: Env,
  sessionId: string
): Promise<User | null> {
  const userId = await env.KV_SESSIONS.get(sessionId);
  if (!userId) {
    return null;
  }

  const user = await env.DB.prepare(
    "SELECT id, email, full_name, bio, location, skills, avatar_url, created_at, updated_at FROM users WHERE id = ?"
  )
    .bind(userId)
    .first<User>();

  return user;
}

export async function deleteSession(
  env: Env,
  sessionId: string
): Promise<void> {
  await env.KV_SESSIONS.delete(sessionId);
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?")
    .bind(sessionId)
    .run();
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<User> {
  const sessionId = getCookie(request, "session");
  if (!sessionId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const user = await getSession(env, sessionId);
  if (!user) {
    throw new Response("Session expired", { status: 401 });
  }

  return user;
}

export function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return null;

  const match = cookies.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
  return match ? match[2] : null;
}

/**
 * Get user ID from session cookie
 * Returns null if not authenticated
 */
export async function getUserIdFromCookie(request: Request): Promise<string | null> {
  const { getEnv } = await import('./env');
  const env = getEnv();

  const sessionId = getCookie(request, 'session');
  if (!sessionId) {
    return null;
  }

  const userId = await env.KV_SESSIONS.get(sessionId);
  return userId;
}

export function setSessionCookie(sessionId: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
