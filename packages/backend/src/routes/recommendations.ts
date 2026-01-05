import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import { getRecommendationsWithJobDetails } from '../services/job-recommendations.service';

const recommendations = new Hono<{ Bindings: Env }>();

// GET /api/recommendations - Get personalized job recommendations
recommendations.get('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '10');

    const results = await getRecommendationsWithJobDetails(c.env, user.id, limit);

    return c.json(results);
  } catch (error: any) {
    console.error('Get recommendations error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default recommendations;
