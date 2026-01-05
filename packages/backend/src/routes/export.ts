import { Hono } from 'hono';
import type { Env } from '../services/db.service';
import { getCurrentUser } from '../services/auth.service';
import {
  generateResumePDF,
  generateResumeDOCX,
  generateCoverLetterPDF,
  generateCoverLetterDOCX,
  type ResumeData,
  type CoverLetterData
} from '../services/document-export.service';

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
      workExperience: workExp.results.map((exp: any) => ({
        company: exp.company,
        title: exp.title,
        location: exp.location,
        startDate: exp.start_date,
        endDate: exp.end_date,
        description: exp.description
      })),
      education: education.results.map((edu: any) => ({
        school: edu.school,
        degree: edu.degree,
        fieldOfStudy: edu.field_of_study,
        startDate: edu.start_date,
        endDate: edu.end_date,
        gpa: edu.gpa
      })),
      skills: parsedData.skills || (user.skills ? JSON.parse(user.skills) : [])
    };

    // Generate document
    let fileBuffer: Uint8Array;
    let contentType: string;
    let filename: string;

    if (format === 'pdf') {
      fileBuffer = await generateResumePDF(resumeData);
      contentType = 'application/pdf';
      filename = `resume_${user.full_name?.replace(/\s+/g, '_') || 'resume'}.pdf`;
    } else {
      fileBuffer = await generateResumeDOCX(resumeData);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `resume_${user.full_name?.replace(/\s+/g, '_') || 'resume'}.docx`;
    }

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  } catch (error: any) {
    console.error('Resume export error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/export/cover-letter/:format - Generate and export cover letter
exportRoutes.post('/cover-letter/:format', async (c) => {
  try {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const format = c.req.param('format') as 'pdf' | 'docx';
    if (format !== 'pdf' && format !== 'docx') {
      return c.json({ error: 'Invalid format. Use pdf or docx' }, 400);
    }

    const body = await c.req.json();
    const { companyName, jobTitle, hiringManagerName, bodyParagraphs } = body;

    if (!companyName || !jobTitle) {
      return c.json({ error: 'companyName and jobTitle are required' }, 400);
    }

    if (!bodyParagraphs || !Array.isArray(bodyParagraphs) || bodyParagraphs.length === 0) {
      return c.json({ error: 'bodyParagraphs array is required' }, 400);
    }

    // Build cover letter data
    const coverLetterData: CoverLetterData = {
      applicantName: user.full_name || 'Your Name',
      applicantEmail: user.email,
      applicantPhone: undefined, // Could be fetched from profile if added
      applicantAddress: user.location,
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

    // Generate document
    let fileBuffer: Uint8Array;
    let contentType: string;
    let filename: string;

    if (format === 'pdf') {
      fileBuffer = await generateCoverLetterPDF(coverLetterData);
      contentType = 'application/pdf';
      filename = `cover_letter_${companyName.replace(/\s+/g, '_')}.pdf`;
    } else {
      fileBuffer = await generateCoverLetterDOCX(coverLetterData);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `cover_letter_${companyName.replace(/\s+/g, '_')}.docx`;
    }

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  } catch (error: any) {
    console.error('Cover letter export error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default exportRoutes;
