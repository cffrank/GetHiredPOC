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
import { toMessage, AppError, UnauthorizedError, NotFoundError, ValidationError } from '../utils/errors';
import { validateFileMagicBytes } from '../utils/file-validation';

const resumes = new Hono<{ Bindings: Env }>();

// POST /api/resumes - Upload and parse resume
resumes.post('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      throw new ValidationError('No file provided');
    }

    if (file.type !== 'application/pdf') {
      throw new ValidationError('Only PDF files are supported');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new ValidationError('File size must be less than 10MB');
    }

    // Validate magic bytes BEFORE reading the full file — reject mismatched content early
    const headerBuffer = await file.slice(0, 8).arrayBuffer();
    if (!validateFileMagicBytes(headerBuffer, file.type)) {
      throw new ValidationError('File content does not match declared type');
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

    const hasData = !!(
      parsedData.fullName ||
      parsedData.workExperience?.length ||
      parsedData.education?.length ||
      parsedData.skills?.length
    );

    return c.json({
      id: resumeId,
      fileName: file.name,
      fileUrl,
      fileSize,
      parsedData,
      isPrimary,
      imported: hasData
    }, 201);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    console.error('Resume upload error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// GET /api/resumes - Get all user resumes
resumes.get('/', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const resumes = await getUserResumes(c.env.DB, user.id);
    return c.json(resumes);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    console.error('Get resumes error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// DELETE /api/resumes/:id - Delete resume
resumes.delete('/:id', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const resumeId = c.req.param('id');
    const success = await deleteResume(c.env.DB, c.env, resumeId, user.id);

    if (!success) {
      throw new NotFoundError('Resume not found');
    }

    return c.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    console.error('Delete resume error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// PATCH /api/resumes/:id/primary - Set resume as primary
resumes.patch('/:id/primary', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }

    const resumeId = c.req.param('id');

    // Verify resume belongs to user
    const resume = await c.env.DB.prepare('SELECT id FROM resumes WHERE id = ? AND user_id = ?')
      .bind(resumeId, user.id)
      .first();

    if (!resume) {
      throw new NotFoundError('Resume not found');
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
    if (error instanceof AppError) throw error;
    console.error('Set primary resume error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default resumes;
