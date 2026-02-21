/**
 * PBKDF2 password hashing utility for the rwsdk app (Cloudflare Workers).
 *
 * Uses the Web Crypto API (crypto.subtle) which is native to Workers —
 * no npm install needed and no CPU-blocking synchronous bcrypt rounds.
 *
 * Hash format: pbkdf2:100000:{saltHex}:{hashHex}
 *
 * Backward compatibility: existing bcryptjs hashes ($2b$/  $2a$) are verified
 * via dynamic import of bcryptjs. All new hashes use PBKDF2.
 */

const ITERATIONS = 100_000;
const HASH_LENGTH = 32; // 256 bits

/**
 * Hash a password using PBKDF2 via Web Crypto API.
 * Returns a string in the format: pbkdf2:100000:{saltHex}:{hashHex}
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(derivedBits);

  return `pbkdf2:${ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a stored hash.
 *
 * Handles two formats:
 * - '$2b$' or '$2a$' prefix: legacy bcryptjs hash — use bcryptjs.compare() for verification only
 * - 'pbkdf2:' prefix: new PBKDF2 hash — re-derive and compare
 *
 * Returns true if the password matches, false otherwise.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    // Legacy bcryptjs hash — verify using bcryptjs
    const bcrypt = await import('bcryptjs');
    return bcrypt.default.compare(password, stored);
  }

  if (stored.startsWith('pbkdf2:')) {
    // Parse: pbkdf2:{iterations}:{saltHex}:{hashHex}
    const parts = stored.split(':');
    if (parts.length !== 4) {
      return false;
    }

    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const storedHashHex = parts[3];

    if (isNaN(iterations) || !saltHex || !storedHashHex) {
      return false;
    }

    const salt = hexToBuffer(saltHex);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      HASH_LENGTH * 8
    );

    const derivedHex = bufferToHex(derivedBits);

    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(derivedHex, storedHashHex);
  }

  // Unknown format
  return false;
}

/**
 * Check if a stored hash is a legacy bcryptjs hash (requires migration).
 */
export function isLegacyHash(stored: string): boolean {
  return stored.startsWith('$2b$') || stored.startsWith('$2a$');
}

// ---- Utilities ----

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return result;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Both strings should be hex-encoded hashes of the same length.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
