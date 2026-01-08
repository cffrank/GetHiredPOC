import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getSession, getCookie } from '../services/auth.service';
import type {
  InterviewQuestion,
  CreateInterviewQuestionRequest,
  UpdateInterviewQuestionRequest,
  InterviewQuestionsListResponse
} from '@gethiredpoc/shared';

type Variables = {
  env: Env;
  userId?: string;
};

const interviewQuestions = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to require authentication
interviewQuestions.use('*', async (c, next) => {
  const sessionId = getCookie(c.req.raw, 'session');
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await getSession(c.env, sessionId);
  if (!session) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  c.set('userId', session.user_id);
  await next();
});

// GET /api/interview-questions - List all questions for user
interviewQuestions.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { application_id, job_id } = c.req.query();

    let query = 'SELECT * FROM interview_questions WHERE user_id = ?';
    const bindings: any[] = [userId];

    if (application_id) {
      query += ' AND application_id = ?';
      bindings.push(application_id);
    }

    if (job_id) {
      query += ' AND job_id = ?';
      bindings.push(job_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(query)
      .bind(...bindings)
      .all<InterviewQuestion>();

    const response: InterviewQuestionsListResponse = {
      questions: result.results || [],
      total: result.results?.length || 0
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Error fetching interview questions:', error);
    return c.json({ error: 'Failed to fetch interview questions' }, 500);
  }
});

// GET /api/interview-questions/:id - Get single question
interviewQuestions.get('/:id', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { id } = c.req.param();

    const question = await c.env.DB.prepare(
      'SELECT * FROM interview_questions WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first<InterviewQuestion>();

    if (!question) {
      return c.json({ error: 'Question not found' }, 404);
    }

    return c.json(question);
  } catch (error: any) {
    console.error('Error fetching interview question:', error);
    return c.json({ error: 'Failed to fetch interview question' }, 500);
  }
});

// POST /api/interview-questions - Create new question
interviewQuestions.post('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const body: CreateInterviewQuestionRequest = await c.req.json();

    if (!body.question) {
      return c.json({ error: 'Question is required' }, 400);
    }

    const isBehavioral = body.is_behavioral ? 1 : 0;

    const result = await c.env.DB.prepare(
      `INSERT INTO interview_questions (
        user_id, application_id, job_id, question, answer,
        is_behavioral, difficulty, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(
        userId,
        body.application_id ?? null,
        body.job_id ?? null,
        body.question,
        body.answer ?? null,
        isBehavioral,
        body.difficulty ?? null,
        body.notes ?? null
      )
      .first<InterviewQuestion>();

    if (!result) {
      throw new Error('Failed to create question');
    }

    return c.json(result, 201);
  } catch (error: any) {
    console.error('Error creating interview question:', error);
    return c.json({ error: error.message || 'Failed to create question' }, 500);
  }
});

// PUT /api/interview-questions/:id - Update question
interviewQuestions.put('/:id', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { id } = c.req.param();
    const body: UpdateInterviewQuestionRequest = await c.req.json();

    // Verify ownership
    const existing = await c.env.DB.prepare(
      'SELECT id FROM interview_questions WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .first();

    if (!existing) {
      return c.json({ error: 'Question not found' }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const bindings: any[] = [];

    if (body.question !== undefined) {
      updates.push('question = ?');
      bindings.push(body.question);
    }
    if (body.answer !== undefined) {
      updates.push('answer = ?');
      bindings.push(body.answer);
    }
    if (body.is_behavioral !== undefined) {
      updates.push('is_behavioral = ?');
      bindings.push(body.is_behavioral ? 1 : 0);
    }
    if (body.difficulty !== undefined) {
      updates.push('difficulty = ?');
      bindings.push(body.difficulty);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      bindings.push(body.notes);
    }

    updates.push('updated_at = unixepoch()');
    bindings.push(id, userId);

    const result = await c.env.DB.prepare(
      `UPDATE interview_questions SET ${updates.join(', ')}
       WHERE id = ? AND user_id = ? RETURNING *`
    )
      .bind(...bindings)
      .first<InterviewQuestion>();

    if (!result) {
      throw new Error('Failed to update question');
    }

    return c.json(result);
  } catch (error: any) {
    console.error('Error updating interview question:', error);
    return c.json({ error: error.message || 'Failed to update question' }, 500);
  }
});

// DELETE /api/interview-questions/:id - Delete question
interviewQuestions.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { id } = c.req.param();

    const result = await c.env.DB.prepare(
      'DELETE FROM interview_questions WHERE id = ? AND user_id = ?'
    )
      .bind(id, userId)
      .run();

    if (!result.success) {
      return c.json({ error: 'Question not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting interview question:', error);
    return c.json({ error: 'Failed to delete question' }, 500);
  }
});

export default interviewQuestions;
