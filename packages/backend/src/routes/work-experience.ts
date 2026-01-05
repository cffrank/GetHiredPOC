import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';

const workExperience = new Hono<{ Bindings: Env }>();

// GET /api/work-experience - Get all work experience for user
workExperience.get('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await c.env.DB.prepare(`
      SELECT id, resume_id, company, title, location, start_date, end_date, description, created_at
      FROM work_experience
      WHERE user_id = ?
      ORDER BY start_date DESC
    `).bind(user.id).all();

    return c.json(result.results);
  } catch (error: any) {
    console.error('Get work experience error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/work-experience - Create new work experience
workExperience.post('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { company, title, location, startDate, endDate, description, resumeId } = body;

    if (!company || !title) {
      return c.json({ error: 'Company and title are required' }, 400);
    }

    // Verify resume belongs to user if resumeId is provided
    if (resumeId) {
      const resume = await c.env.DB.prepare('SELECT id FROM resumes WHERE id = ? AND user_id = ?')
        .bind(resumeId, user.id)
        .first();

      if (!resume) {
        return c.json({ error: 'Resume not found' }, 404);
      }
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO work_experience (user_id, resume_id, company, title, location, start_date, end_date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      resumeId || null,
      company,
      title,
      location || null,
      startDate || null,
      endDate || null,
      description || null
    ).run();

    const experienceId = result.meta.last_row_id?.toString() || '';

    return c.json({
      id: experienceId,
      userId: user.id,
      resumeId,
      company,
      title,
      location,
      startDate,
      endDate,
      description
    }, 201);
  } catch (error: any) {
    console.error('Create work experience error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/work-experience/:id - Update work experience
workExperience.put('/:id', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const experienceId = c.req.param('id');
    const body = await c.req.json();
    const { company, title, location, startDate, endDate, description } = body;

    // Verify work experience belongs to user
    const existing = await c.env.DB.prepare('SELECT id FROM work_experience WHERE id = ? AND user_id = ?')
      .bind(experienceId, user.id)
      .first();

    if (!existing) {
      return c.json({ error: 'Work experience not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE work_experience SET
        company = ?, title = ?, location = ?, start_date = ?, end_date = ?, description = ?
      WHERE id = ?
    `).bind(
      company,
      title,
      location || null,
      startDate || null,
      endDate || null,
      description || null,
      experienceId
    ).run();

    return c.json({
      id: experienceId,
      company,
      title,
      location,
      startDate,
      endDate,
      description
    });
  } catch (error: any) {
    console.error('Update work experience error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/work-experience/:id - Delete work experience
workExperience.delete('/:id', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const experienceId = c.req.param('id');

    // Verify work experience belongs to user
    const existing = await c.env.DB.prepare('SELECT id FROM work_experience WHERE id = ? AND user_id = ?')
      .bind(experienceId, user.id)
      .first();

    if (!existing) {
      return c.json({ error: 'Work experience not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM work_experience WHERE id = ?')
      .bind(experienceId)
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete work experience error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default workExperience;
