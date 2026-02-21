import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import {
  parseResume,
  uploadResumePDF,
  saveResume,
  getUserResumes,
  deleteResume
} from '../services/resume.service';
import { toMessage } from '../utils/errors';

const resumes = new Hono<{ Bindings: Env }>();

// POST /api/resumes - Upload and parse resume
resumes.post('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (file.type !== 'application/pdf') {
      return c.json({ error: 'Only PDF files are supported' }, 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File size must be less than 10MB' }, 400);
    }

    // Upload PDF to R2
    const { fileUrl, fileSize } = await uploadResumePDF(c.env, user.id, file);

    // Parse PDF and extract structured data
    const parsedData = await parseResume(c.env, await file.arrayBuffer());

    // Save resume to database
    const resumeId = await saveResume(c.env.DB, {
      userId: user.id,
      fileName: file.name,
      fileUrl,
      fileSize,
      parsedData,
      isPrimary
    });

    return c.json({
      id: resumeId,
      fileName: file.name,
      fileUrl,
      fileSize,
      parsedData,
      isPrimary
    }, 201);
  } catch (error: unknown) {
    console.error('Resume upload error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// GET /api/resumes - Get all user resumes
resumes.get('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const resumes = await getUserResumes(c.env.DB, user.id);
    return c.json(resumes);
  } catch (error: unknown) {
    console.error('Get resumes error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// DELETE /api/resumes/:id - Delete resume
resumes.delete('/:id', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const resumeId = c.req.param('id');
    const success = await deleteResume(c.env.DB, c.env, resumeId, user.id);

    if (!success) {
      return c.json({ error: 'Resume not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete resume error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PATCH /api/resumes/:id/primary - Set resume as primary
resumes.patch('/:id/primary', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const resumeId = c.req.param('id');

    // Verify resume belongs to user
    const resume = await c.env.DB.prepare('SELECT id FROM resumes WHERE id = ? AND user_id = ?')
      .bind(resumeId, user.id)
      .first();

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404);
    }

    // Unset other primary resumes
    await c.env.DB.prepare('UPDATE resumes SET is_primary = 0 WHERE user_id = ?')
      .bind(user.id)
      .run();

    // Set this resume as primary
    await c.env.DB.prepare('UPDATE resumes SET is_primary = 1 WHERE id = ?')
      .bind(resumeId)
      .run();

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Set primary resume error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default resumes;
