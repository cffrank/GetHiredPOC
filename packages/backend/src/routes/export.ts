import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import { toMessage } from '../utils/errors';
import { coverLetterExportSchema } from '../schemas/export.schema';
import { validationHook } from '../schemas/validation-hook';

interface ResumeData {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  workExperience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  skills?: string[];
}

interface CoverLetterData {
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  applicantAddress?: string;
  companyName: string;
  jobTitle: string;
  hiringManagerName?: string;
  bodyParagraphs: string[];
  date: string;
}

const exportRoutes = new Hono<{ Bindings: Env }>();

// GET /api/export/resume/:format - Export user's resume
exportRoutes.get('/resume/:format', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const format = c.req.param('format') as 'pdf' | 'docx';
    if (format !== 'pdf' && format !== 'docx') {
      return c.json({ error: 'Invalid format. Use pdf or docx' }, 400);
    }

    // Get user's primary resume or latest resume
    const resume = await c.env.DB.prepare(`
      SELECT * FROM resumes
      WHERE user_id = ?
      ORDER BY is_primary DESC, created_at DESC
      LIMIT 1
    `).bind(user.id).first();

    if (!resume) {
      return c.json({ error: 'No resume found. Please upload a resume first.' }, 404);
    }

    // Get work experience
    const workExp = await c.env.DB.prepare(`
      SELECT company, title, location, start_date, end_date, description
      FROM work_experience
      WHERE user_id = ?
      ORDER BY start_date DESC
    `).bind(user.id).all();

    // Get education
    const education = await c.env.DB.prepare(`
      SELECT school, degree, field_of_study, start_date, end_date, gpa
      FROM education
      WHERE user_id = ?
      ORDER BY start_date DESC
    `).bind(user.id).all();

    // Parse resume data
    const parsedData = resume.parsed_data ? JSON.parse(resume.parsed_data as string) : {};

    // Build resume data
    const resumeData: ResumeData = {
      fullName: user.full_name || parsedData.fullName || 'Your Name',
      email: user.email,
      phone: parsedData.phone,
      location: user.location || parsedData.location,
      summary: user.bio || parsedData.summary,
      workExperience: workExp.results.map((exp) => {
        const e = exp as { company: string; title: string; location: string | null; start_date: string | null; end_date: string | null; description: string | null };
        return {
          company: e.company,
          title: e.title,
          location: e.location ?? undefined,
          startDate: e.start_date ?? undefined,
          endDate: e.end_date ?? undefined,
          description: e.description ?? undefined,
        };
      }),
      education: education.results.map((edu) => {
        const e = edu as { school: string; degree: string | null; field_of_study: string | null; start_date: string | null; end_date: string | null; gpa: string | null };
        return {
          school: e.school,
          degree: e.degree ?? undefined,
          fieldOfStudy: e.field_of_study ?? undefined,
          startDate: e.start_date ?? undefined,
          endDate: e.end_date ?? undefined,
          gpa: e.gpa ?? undefined,
        };
      }),
      skills: parsedData.skills || (user.skills ? JSON.parse(user.skills) : [])
    };

    // Generate document via document worker
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
    const filename = format === 'pdf'
      ? `resume_${user.full_name?.replace(/\s+/g, '_') || 'resume'}.pdf`
      : `resume_${user.full_name?.replace(/\s+/g, '_') || 'resume'}.docx`;

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  } catch (error: unknown) {
    console.error('Resume export error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

// POST /api/export/cover-letter/:format - Generate and export cover letter
exportRoutes.post('/cover-letter/:format', zValidator('json', coverLetterExportSchema, validationHook), async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const format = c.req.param('format') as 'pdf' | 'docx';
    if (format !== 'pdf' && format !== 'docx') {
      return c.json({ error: 'Invalid format. Use pdf or docx' }, 400);
    }

    const { companyName, jobTitle, hiringManagerName, bodyParagraphs } = c.req.valid('json');

    // Build cover letter data
    const coverLetterData: CoverLetterData = {
      applicantName: user.full_name || 'Your Name',
      applicantEmail: user.email,
      applicantPhone: undefined,
      applicantAddress: user.location ?? undefined,
      companyName,
      jobTitle,
      hiringManagerName,
      bodyParagraphs,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    // Generate document via document worker
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
    const filename = format === 'pdf'
      ? `cover_letter_${companyName.replace(/\s+/g, '_')}.pdf`
      : `cover_letter_${companyName.replace(/\s+/g, '_')}.docx`;

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  } catch (error: unknown) {
    console.error('Cover letter export error:', error);
    return c.json({ error: toMessage(error) }, 500);
  }
});

export default exportRoutes;
