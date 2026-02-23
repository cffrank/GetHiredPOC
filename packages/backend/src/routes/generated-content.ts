import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getSession, getCookie } from '../services/auth.service';
import { toMessage } from '../utils/errors';
import type { User, GeneratedResume, GeneratedCoverLetter } from '@gethiredpoc/shared';

type Variables = {
  env: Env;
  userId?: string;
};

const generatedContent = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware to require auth
async function requireAuth(c: any): Promise<User> {
  const sessionId = getCookie(c.req.raw, "session");
  if (!sessionId) {
    throw new Error('Unauthorized');
  }

  const user = await getSession(c.env, sessionId);
  if (!user) {
    throw new Error('Session expired');
  }

  return user;
}

// GET /api/applications/job/:jobId/generated-content
// Get all generated content for a job (analysis, resumes, cover letters)
generatedContent.get('/job/:jobId/generated-content', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('jobId');

    // Get application (for analysis)
    const application = await c.env.DB.prepare(
      'SELECT * FROM applications WHERE user_id = ? AND job_id = ?'
    )
      .bind(user.id, jobId)
      .first();

    // Get all resume versions
    const resumes = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id, jobId)
      .all();

    // Get all cover letter versions
    const coverLetters = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id, jobId)
      .all();

    return c.json({
      analysis: application?.ai_analysis ? JSON.parse(application.ai_analysis) : null,
      resumes: resumes.results || [],
      coverLetters: coverLetters.results || []
    }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/applications/job/:jobId/resumes
// Get all resume versions for a job
generatedContent.get('/job/:jobId/resumes', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('jobId');

    const resumes = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id, jobId)
      .all();

    return c.json({ resumes: resumes.results || [] }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/applications/job/:jobId/cover-letters
// Get all cover letter versions for a job
generatedContent.get('/job/:jobId/cover-letters', async (c) => {
  try {
    const user = await requireAuth(c);
    const jobId = c.req.param('jobId');

    const coverLetters = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC'
    )
      .bind(user.id, jobId)
      .all();

    return c.json({ coverLetters: coverLetters.results || [] }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/applications/generated-resumes/:id
// Delete a specific resume version
generatedContent.delete('/generated-resumes/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');

    // Verify ownership
    const resume = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE id = ? AND user_id = ?'
    )
      .bind(id, user.id)
      .first<GeneratedResume>();

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM generated_resumes WHERE id = ?')
      .bind(id)
      .run();

    return c.json({ success: true }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/applications/generated-cover-letters/:id
// Delete a specific cover letter version
generatedContent.delete('/generated-cover-letters/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');

    // Verify ownership
    const coverLetter = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE id = ? AND user_id = ?'
    )
      .bind(id, user.id)
      .first<GeneratedCoverLetter>();

    if (!coverLetter) {
      return c.json({ error: 'Cover letter not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM generated_cover_letters WHERE id = ?')
      .bind(id)
      .run();

    return c.json({ success: true }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/applications/generated-resumes/:id
// Rename a resume version
generatedContent.patch('/generated-resumes/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const resume = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE id = ? AND user_id = ?'
    )
      .bind(id, user.id)
      .first<GeneratedResume>();

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404);
    }

    if (body.version_name) {
      await c.env.DB.prepare(
        'UPDATE generated_resumes SET version_name = ?, updated_at = unixepoch() WHERE id = ?'
      )
        .bind(body.version_name, id)
        .run();
    }

    const updated = await c.env.DB.prepare('SELECT * FROM generated_resumes WHERE id = ?')
      .bind(id)
      .first<GeneratedResume>();

    return c.json({ resume: updated }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /api/applications/generated-cover-letters/:id
// Rename a cover letter version
generatedContent.patch('/generated-cover-letters/:id', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const coverLetter = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE id = ? AND user_id = ?'
    )
      .bind(id, user.id)
      .first<GeneratedCoverLetter>();

    if (!coverLetter) {
      return c.json({ error: 'Cover letter not found' }, 404);
    }

    if (body.version_name) {
      await c.env.DB.prepare(
        'UPDATE generated_cover_letters SET version_name = ?, updated_at = unixepoch() WHERE id = ?'
      )
        .bind(body.version_name, id)
        .run();
    }

    const updated = await c.env.DB.prepare('SELECT * FROM generated_cover_letters WHERE id = ?')
      .bind(id)
      .first<GeneratedCoverLetter>();

    return c.json({ coverLetter: updated }, 200);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/applications/generated-resumes/:id/download/:format
// Download a generated resume as PDF or DOCX
generatedContent.get('/generated-resumes/:id/download/:format', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');
    const format = c.req.param('format') as 'pdf' | 'docx';

    if (format !== 'pdf' && format !== 'docx') {
      return c.json({ error: 'Invalid format. Use pdf or docx' }, 400);
    }

    // Fetch the generated resume (verify ownership)
    const resume = await c.env.DB.prepare(
      'SELECT * FROM generated_resumes WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first<GeneratedResume>();

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404);
    }

    // Parse the AI-generated resume data
    const aiResume = JSON.parse(resume.resume_data);

    // Map AI resume format to document-worker ResumeData format
    const resumeData = {
      fullName: user.full_name || 'Your Name',
      email: user.email,
      phone: undefined as string | undefined,
      location: user.location ?? undefined,
      summary: aiResume.summary,
      workExperience: (aiResume.experience || []).map((exp: any) => ({
        company: exp.company,
        title: exp.title,
        startDate: exp.dates,
        endDate: undefined as string | undefined,
        description: (exp.highlights || exp.achievements || []).join('. '),
      })),
      education: (aiResume.education || []).map((edu: any) => ({
        school: edu.school,
        degree: edu.degree,
        fieldOfStudy: edu.field,
      })),
      skills: aiResume.skills || [],
    };

    // Generate document via document-worker
    const docType = format === 'pdf' ? 'resume-pdf' : 'resume-docx';
    const res = await c.env.DOCUMENT_WORKER.fetch('https://document/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: docType, data: resumeData }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Document worker error (${res.status}): ${errorBody}`);
    }

    const fileBuffer = new Uint8Array(await res.arrayBuffer());
    const contentType = format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const filename = `resume_${user.full_name?.replace(/\s+/g, '_') || 'resume'}.${format}`;

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    console.error('Resume download error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// GET /api/applications/generated-cover-letters/:id/download/:format
// Download a generated cover letter as PDF or DOCX
generatedContent.get('/generated-cover-letters/:id/download/:format', async (c) => {
  try {
    const user = await requireAuth(c);
    const id = c.req.param('id');
    const format = c.req.param('format') as 'pdf' | 'docx';

    if (format !== 'pdf' && format !== 'docx') {
      return c.json({ error: 'Invalid format. Use pdf or docx' }, 400);
    }

    // Fetch the generated cover letter (verify ownership)
    const coverLetter = await c.env.DB.prepare(
      'SELECT * FROM generated_cover_letters WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first<GeneratedCoverLetter>();

    if (!coverLetter) {
      return c.json({ error: 'Cover letter not found' }, 404);
    }

    // Get job info for the cover letter
    const job = await c.env.DB.prepare(
      'SELECT title, company FROM jobs WHERE id = ?'
    ).bind(coverLetter.job_id).first<{ title: string; company: string }>();

    // Parse cover letter text into body paragraphs
    // Split on double newlines, skip greeting/closing lines
    const lines = coverLetter.cover_letter_text.split(/\n\n+/).filter(Boolean);
    const bodyParagraphs: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip greeting lines (Dear...) and closing lines (Sincerely, etc.)
      if (/^(Dear|To Whom)/i.test(trimmed)) continue;
      if (/^(Sincerely|Best regards|Regards|Warm regards|Respectfully|Thank you)/i.test(trimmed)) continue;
      // Skip standalone name lines (last block that's just a name)
      if (trimmed.split('\n').length === 1 && trimmed.split(' ').length <= 4 && lines.indexOf(line) === lines.length - 1) continue;
      bodyParagraphs.push(trimmed);
    }

    const coverLetterData = {
      applicantName: user.full_name || 'Your Name',
      applicantEmail: user.email,
      applicantAddress: user.location ?? undefined,
      companyName: job?.company || 'Company',
      jobTitle: job?.title || 'Position',
      bodyParagraphs: bodyParagraphs.length > 0 ? bodyParagraphs : [coverLetter.cover_letter_text],
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    // Generate document via document-worker
    const docType = format === 'pdf' ? 'cover-letter-pdf' : 'cover-letter-docx';
    const res = await c.env.DOCUMENT_WORKER.fetch('https://document/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: docType, data: coverLetterData }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Document worker error (${res.status}): ${errorBody}`);
    }

    const fileBuffer = new Uint8Array(await res.arrayBuffer());
    const contentType = format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const companySlug = (job?.company || 'company').replace(/\s+/g, '_');
    const filename = `cover_letter_${companySlug}.${format}`;

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Session expired') {
      return c.json({ error: error.message }, 401);
    }
    console.error('Cover letter download error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default generatedContent;
