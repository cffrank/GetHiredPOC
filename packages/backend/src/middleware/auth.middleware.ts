import { Context, Next } from 'hono';
import type { User } from '@gethiredpoc/shared';
import { getCurrentUser } from '../services/auth.service';
import type { Env } from '../services/db.service';

// Shared Variables type for Hono context — all routes that use requireAuth
// have access to c.get('user') as User after this middleware runs
export interface AppVariables {
  user: User;
}

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 * Sets c.var.user (accessible via c.get('user')) for downstream handlers
 */
export async function requireAuth(c: AppContext, next: Next) {
  const user = await getCurrentUser(c);

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  // Store user in context for downstream handlers
  c.set('user', user);
  await next();
}

/**
 * Middleware to require admin role
 * Must be used after requireAuth middleware
 * Returns 403 if user is not an admin
 */
export async function requireAdmin(c: AppContext, next: Next) {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  // Get admin emails from environment variable
  const adminEmailsString = c.env.ADMIN_EMAILS || '';
  const adminEmails = adminEmailsString.split(',').map((email: string) => email.trim().toLowerCase());

  // Check if user's email is in the admin list OR user has admin role
  const isAdmin = adminEmails.includes(user.email.toLowerCase()) || user.role === 'admin';

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
}

/**
 * Middleware to require paid membership
 * Must be used after requireAuth middleware
 * Returns 403 if user does not have an active paid membership
 */
export async function requirePaidMembership(c: AppContext, next: Next) {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  // Check if user has paid membership
  if (user.membership_tier !== 'paid') {
    return c.json({
      error: 'Paid membership required',
      message: 'This feature requires an active paid membership'
    }, 403);
  }

  // Check if membership has expired
  if (user.membership_expires_at && user.membership_expires_at < Math.floor(Date.now() / 1000)) {
    return c.json({
      error: 'Membership expired',
      message: 'Your membership has expired. Please renew to access this feature'
    }, 403);
  }

  await next();
}
