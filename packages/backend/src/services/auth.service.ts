import bcrypt from 'bcryptjs';
import type { User } from '@gethiredpoc/shared';
import type { Env } from './db.service';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Validation functions
export function validatePhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 10 || digitsOnly.length === 11;
}

export function validateZipCode(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip);
}

export function validateState(state: string): boolean {
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];
  return states.includes(state.toUpperCase());
}

export interface SignupData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

export async function signup(
  env: Env,
  data: SignupData
): Promise<{ user: User; sessionId: string }> {
  // Validate required fields
  if (!data.email || !data.password || !data.first_name || !data.last_name ||
      !data.phone || !data.street_address || !data.city || !data.state || !data.zip_code) {
    throw new Error("All fields are required");
  }

  // Validate phone number format
  if (!validatePhone(data.phone)) {
    throw new Error("Invalid phone number format. Must be 10 or 11 digits.");
  }

  // Validate zip code format
  if (!validateZipCode(data.zip_code)) {
    throw new Error("Invalid zip code format. Must be 12345 or 12345-6789.");
  }

  // Validate state code
  if (!validateState(data.state)) {
    throw new Error("Invalid state code. Must be a valid 2-letter US state code.");
  }

  // Check if user already exists
  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  )
    .bind(data.email)
    .first();

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(data.password);

  // Set new users to PRO trial automatically
  const trialStartsAt = Math.floor(Date.now() / 1000);
  const trialExpiresAt = trialStartsAt + (14 * 24 * 60 * 60); // 14 days

  const result = await env.DB.prepare(
    `INSERT INTO users (
      email, password_hash,
      first_name, last_name, phone,
      street_address, city, state, zip_code,
      subscription_tier, subscription_status,
      trial_started_at, trial_expires_at, is_trial
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING
     id, email, first_name, last_name, phone,
     street_address, city, state, zip_code,
     bio, location, skills, avatar_url, linkedin_url, role,
     membership_tier, membership_started_at, membership_expires_at, trial_started_at,
     subscription_tier, subscription_status, subscription_started_at, subscription_expires_at,
     polar_customer_id, polar_subscription_id, trial_expires_at, is_trial,
     created_at, updated_at`
  )
    .bind(
      data.email, passwordHash,
      data.first_name, data.last_name, data.phone,
      data.street_address, data.city, data.state.toUpperCase(), data.zip_code,
      'pro', 'active', trialStartsAt, trialExpiresAt, 1
    )
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
    `SELECT id, email, password_hash, full_name,
     first_name, last_name, phone,
     street_address, city, state, zip_code, address,
     bio, location, skills, avatar_url, linkedin_url, role,
     membership_tier, membership_started_at, membership_expires_at, trial_started_at,
     subscription_tier, subscription_status, subscription_started_at, subscription_expires_at,
     polar_customer_id, polar_subscription_id, trial_expires_at, is_trial,
     created_at, updated_at
     FROM users WHERE email = ?`
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
    `SELECT id, email, full_name, first_name, last_name, phone,
     street_address, city, state, zip_code, address,
     bio, location, skills, avatar_url, linkedin_url, role,
     membership_tier, membership_started_at, membership_expires_at, trial_started_at,
     subscription_tier, subscription_status, subscription_started_at, subscription_expires_at,
     polar_customer_id, polar_subscription_id, trial_expires_at, is_trial,
     created_at, updated_at
     FROM users WHERE id = ?`
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

export function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return null;

  const match = cookies.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
  return match ? match[2] : null;
}

export function setSessionCookie(sessionId: string, isProduction: boolean = false): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  if (isProduction) {
    // Production: cross-origin cookies require SameSite=None, Secure, and Partitioned (CHIPS)
    return `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${maxAge}`;
  } else {
    // Development: same-origin
    return `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  }
}

export function clearSessionCookie(isProduction: boolean = false): string {
  if (isProduction) {
    return "session=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0";
  } else {
    return "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  }
}

/**
 * Get current user from session cookie OR Authorization header in Hono context
 */
export async function getCurrentUser(c: any): Promise<User | null> {
  // Try cookie first (for same-origin or browsers that support Partitioned cookies)
  let sessionId = getCookie(c.req.raw, 'session');

  // Fallback to Authorization header (for cross-origin when cookies are blocked)
  if (!sessionId) {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.substring(7); // Remove "Bearer " prefix
    }
  }

  if (!sessionId) {
    return null;
  }

  return getSession(c.env, sessionId);
}
