import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import { toMessage } from '../utils/errors';

const education = new Hono<{ Bindings: Env }>();

// GET /api/education - Get all education for user
education.get('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await c.env.DB.prepare(`
      SELECT id, resume_id, school, degree, field_of_study, start_date, end_date, gpa, created_at
      FROM education
      WHERE user_id = ?
      ORDER BY start_date DESC
    `).bind(user.id).all();

    return c.json(result.results);
  } catch (error: unknown) {
    console.error('Get education error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/education - Create new education
education.post('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { school, degree, field_of_study, start_date, end_date, gpa, resume_id } = body;

    if (!school) {
      return c.json({ error: 'School is required' }, 400);
    }

    // Verify resume belongs to user if resume_id is provided
    if (resume_id) {
      const resume = await c.env.DB.prepare('SELECT id FROM resumes WHERE id = ? AND user_id = ?')
        .bind(resume_id, user.id)
        .first();

      if (!resume) {
        return c.json({ error: 'Resume not found' }, 404);
      }
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO education (user_id, resume_id, school, degree, field_of_study, start_date, end_date, gpa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      resume_id || null,
      school,
      degree || null,
      field_of_study || null,
      start_date || null,
      end_date || null,
      gpa || null
    ).run();

    const educationId = result.meta.last_row_id?.toString() || '';

    return c.json({
      id: educationId,
      user_id: user.id,
      resume_id,
      school,
      degree,
      field_of_study,
      start_date,
      end_date,
      gpa
    }, 201);
  } catch (error: unknown) {
    console.error('Create education error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PUT /api/education/:id - Update education
education.put('/:id', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const educationId = c.req.param('id');
    const body = await c.req.json();
    const { school, degree, field_of_study, start_date, end_date, gpa } = body;

    // Verify education belongs to user
    const existing = await c.env.DB.prepare('SELECT id FROM education WHERE id = ? AND user_id = ?')
      .bind(educationId, user.id)
      .first();

    if (!existing) {
      return c.json({ error: 'Education not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE education SET
        school = ?, degree = ?, field_of_study = ?, start_date = ?, end_date = ?, gpa = ?
      WHERE id = ?
    `).bind(
      school,
      degree || null,
      field_of_study || null,
      start_date || null,
      end_date || null,
      gpa || null,
      educationId
    ).run();

    return c.json({
      id: educationId,
      school,
      degree,
      field_of_study,
      start_date,
      end_date,
      gpa
    });
  } catch (error: unknown) {
    console.error('Update education error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// DELETE /api/education/:id - Delete education
education.delete('/:id', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const educationId = c.req.param('id');

    // Verify education belongs to user
    const existing = await c.env.DB.prepare('SELECT id FROM education WHERE id = ? AND user_id = ?')
      .bind(educationId, user.id)
      .first();

    if (!existing) {
      return c.json({ error: 'Education not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM education WHERE id = ?')
      .bind(educationId)
      .run();

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete education error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default education;
