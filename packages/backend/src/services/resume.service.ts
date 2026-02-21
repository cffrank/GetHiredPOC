import type { Env } from './db.service';
import type { ParsedResume } from '@gethiredpoc/shared';
import { sanitizeResumeData } from '../utils/sanitize';

export type { ParsedResume };

/**
 * Parse PDF resume and extract structured data using AI
 *
 * Uses a simplified approach: extract text using basic PDF parsing,
 * then use AI to structure the data
 */
export async function parseResume(
  env: Env,
  pdfBuffer: ArrayBuffer
): Promise<ParsedResume> {
  try {
    // Convert PDF to text (basic extraction)
    // Note: This is a simplified approach. For better results, consider using a dedicated PDF parsing service
    const pdfText = await extractTextFromPDF(pdfBuffer);

    if (!pdfText || pdfText.trim().length === 0) {
      console.warn('No text extracted from PDF');
      return {
        workExperience: [],
        education: [],
        skills: []
      };
    }

    // Use AI to parse the resume text into structured data
    const prompt = `Extract structured data from this resume text. Return a JSON object with this exact structure:
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "summary": "string",
  "workExperience": [
    {
      "company": "string",
      "title": "string",
      "location": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "description": "string"
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "fieldOfStudy": "string",
      "startDate": "YYYY",
      "endDate": "YYYY or null if current",
      "gpa": "string"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"]
}

Return ONLY valid JSON, no markdown or explanations.

Resume Text:
${pdfText.substring(0, 10000)}`; // Limit to 10k chars to stay within token limits

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a resume parsing assistant. Extract structured information from resumes and return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2048
    });

    // Parse AI response
    let jsonText = (response as any).response || '';
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(jsonText);

    return {
      fullName: parsed.fullName || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
      summary: parsed.summary || '',
      workExperience: parsed.workExperience || [],
      education: parsed.education || [],
      skills: parsed.skills || []
    };
  } catch (error) {
    console.error('Resume parsing error:', error);
    // Return empty structure if parsing fails
    return {
      workExperience: [],
      education: [],
      skills: []
    };
  }
}

/**
 * Basic PDF text extraction
 * This is a simplified implementation. For production, consider using a dedicated PDF library
 */
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Convert ArrayBuffer to string and look for text content
    // This is a very basic approach that works for simple PDFs
    // For complex PDFs, you'd need a proper PDF parsing library

    const uint8Array = new Uint8Array(pdfBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = decoder.decode(uint8Array);

    // Remove PDF control characters and binary data
    text = text.replace(/[^\x20-\x7E\n\r]/g, ' ');

    // Clean up multiple spaces and newlines
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return '';
  }
}

/**
 * Upload resume PDF to R2 storage
 */
export async function uploadResumePDF(
  env: Env,
  userId: string,
  file: File
): Promise<{ fileUrl: string; fileSize: number }> {
  const key = `resumes/${userId}/${Date.now()}-${file.name}`;

  await env.STORAGE.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: 'application/pdf'
    }
  });

  // Use absolute backend URL for file serving
  const baseUrl = env.BACKEND_URL || 'http://localhost:8787';

  return {
    fileUrl: `${baseUrl}/api/files/${key}`,
    fileSize: file.size
  };
}

/**
 * Save resume record to database
 */
export async function saveResume(
  db: D1Database,
  resumeData: {
    userId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    parsedData: ParsedResume;
    isPrimary?: boolean;
  }
): Promise<string> {
  // Sanitize AI-parsed resume fields before storage (write-time XSS defense)
  const sanitizedParsedData = sanitizeResumeData(resumeData.parsedData);
  const safeResumeData = { ...resumeData, parsedData: sanitizedParsedData };

  // If this is set as primary, unset other primary resumes
  if (safeResumeData.isPrimary) {
    await db.prepare('UPDATE resumes SET is_primary = 0 WHERE user_id = ?')
      .bind(safeResumeData.userId)
      .run();
  }

  const result = await db.prepare(`
    INSERT INTO resumes (user_id, file_name, file_url, file_size, parsed_data, is_primary)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    safeResumeData.userId,
    safeResumeData.fileName,
    safeResumeData.fileUrl,
    safeResumeData.fileSize,
    JSON.stringify(safeResumeData.parsedData),
    safeResumeData.isPrimary ? 1 : 0
  ).run();

  // Extract the resume ID from the result
  const resumeId = result.meta.last_row_id?.toString() || '';

  // Save work experience
  for (const exp of safeResumeData.parsedData.workExperience) {
    await db.prepare(`
      INSERT INTO work_experience (user_id, resume_id, company, title, location, start_date, end_date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      safeResumeData.userId,
      resumeId,
      exp.company,
      exp.title,
      exp.location || null,
      exp.startDate || null,
      exp.endDate || null,
      exp.description || null
    ).run();
  }

  // Save education
  for (const edu of safeResumeData.parsedData.education) {
    await db.prepare(`
      INSERT INTO education (user_id, resume_id, school, degree, field_of_study, start_date, end_date, gpa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      safeResumeData.userId,
      resumeId,
      edu.school,
      edu.degree || null,
      edu.fieldOfStudy || null,
      edu.startDate || null,
      edu.endDate || null,
      edu.gpa || null
    ).run();
  }

  return resumeId;
}

/**
 * Get user's resumes
 */
export async function getUserResumes(
  db: D1Database,
  userId: string
): Promise<any[]> {
  const result = await db.prepare(`
    SELECT id, file_name, file_url, file_size, parsed_data, is_primary, created_at
    FROM resumes
    WHERE user_id = ?
    ORDER BY is_primary DESC, created_at DESC
  `).bind(userId).all();

  return result.results.map(resume => ({
    ...resume,
    parsed_data: resume.parsed_data ? JSON.parse(resume.parsed_data as string) : null
  }));
}

/**
 * Delete resume and associated data
 */
export async function deleteResume(
  db: D1Database,
  env: Env,
  resumeId: string,
  userId: string
): Promise<boolean> {
  // Get resume info
  const resume = await db.prepare('SELECT file_url FROM resumes WHERE id = ? AND user_id = ?')
    .bind(resumeId, userId)
    .first();

  if (!resume) {
    return false;
  }

  // Delete from R2
  const key = (resume.file_url as string).replace('/api/files/', '');
  await env.STORAGE.delete(key);

  // Delete from database (CASCADE will handle work_experience and education)
  await db.prepare('DELETE FROM resumes WHERE id = ?')
    .bind(resumeId)
    .run();

  return true;
}
