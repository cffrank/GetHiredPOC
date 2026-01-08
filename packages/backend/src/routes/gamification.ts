/**
 * Gamification Routes
 *
 * User routes for XP, levels, and achievements
 */

import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { requireAuth } from '../middleware/auth.middleware';
import { getUserStats } from '../services/gamification.service';

const gamification = new Hono<{ Bindings: Env }>();

// Require auth for all gamification routes
gamification.use('*', requireAuth);

/**
 * GET /api/gamification/me
 * Get current user's gamification stats (level, XP, achievements)
 */
gamification.get('/me', async (c) => {
  try {
    const user = c.get('user');
    const stats = await getUserStats(c.env.DB, user.id);
    return c.json(stats);
  } catch (error: any) {
    console.error('Failed to get gamification stats:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default gamification;
