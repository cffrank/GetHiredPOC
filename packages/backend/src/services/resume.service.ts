import type { Env } from './db.service';

export interface ParsedResume {
  fullName?: string;
  email?: string;
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

/**
 * Parse PDF resume and extract structured data using AI
 *
 * NOTE: PDF text extraction requires additional libraries that aren't compatible
 * with Cloudflare Workers. For MVP, we're skipping automatic parsing.
 * Users will manually enter their work experience and education.
 */
export async function parseResume(
  env: Env,
  pdfBuffer: ArrayBuffer
): Promise<ParsedResume> {
  // TODO: Implement PDF text extraction using a Workers-compatible library
  // For now, return empty structure - users will manually enter their data

  console.log(`Resume uploaded (${pdfBuffer.byteLength} bytes), manual entry required`);

  return {
    workExperience: [],
    education: [],
    skills: []
  };
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
  // If this is set as primary, unset other primary resumes
  if (resumeData.isPrimary) {
    await db.prepare('UPDATE resumes SET is_primary = 0 WHERE user_id = ?')
      .bind(resumeData.userId)
      .run();
  }

  const result = await db.prepare(`
    INSERT INTO resumes (user_id, file_name, file_url, file_size, parsed_data, is_primary)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    resumeData.userId,
    resumeData.fileName,
    resumeData.fileUrl,
    resumeData.fileSize,
    JSON.stringify(resumeData.parsedData),
    resumeData.isPrimary ? 1 : 0
  ).run();

  // Extract the resume ID from the result
  const resumeId = result.meta.last_row_id?.toString() || '';

  // Save work experience
  for (const exp of resumeData.parsedData.workExperience) {
    await db.prepare(`
      INSERT INTO work_experience (user_id, resume_id, company, title, location, start_date, end_date, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resumeData.userId,
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
  for (const edu of resumeData.parsedData.education) {
    await db.prepare(`
      INSERT INTO education (user_id, resume_id, school, degree, field_of_study, start_date, end_date, gpa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resumeData.userId,
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
