// Resume Upload and Parsing API
import { getEnv } from '@/app/lib/env';
import { getUserIdFromCookie } from '@/app/lib/auth';
import { parseResumeWithAI, saveParsedResumeToProfile } from '@/app/lib/resume-parser';

/**
 * Upload and parse resume
 * POST /api/resume/upload
 */
export async function handleResumeUpload({ request }: { request: Request }): Promise<Response> {
  try {
    const env = getEnv();

    // Verify user is logged in
    const userId = await getUserIdFromCookie(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return Response.json({
        error: 'Invalid file type. Please upload PDF, TXT, DOC, or DOCX'
      }, { status: 400 });
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return Response.json({
        error: 'File too large. Maximum size is 5MB'
      }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    let resumeText: string;

    // Extract text based on file type
    if (file.type === 'application/pdf') {
      // For PDF, we'll need to extract text
      // For now, convert to string (in production, use pdf-parse library)
      const decoder = new TextDecoder('utf-8');
      resumeText = decoder.decode(arrayBuffer);
    } else {
      // For text files
      const decoder = new TextDecoder('utf-8');
      resumeText = decoder.decode(arrayBuffer);
    }

    // Validate text length
    if (resumeText.length < 100) {
      return Response.json({
        error: 'Resume text too short. Please provide a complete resume.'
      }, { status: 400 });
    }

    if (resumeText.length > 50000) {
      return Response.json({
        error: 'Resume text too long. Please keep resume under 50,000 characters.'
      }, { status: 400 });
    }

    // Parse with AI
    const parsedData = await parseResumeWithAI(env.AI, resumeText);

    // Return parsed data for user review (don't auto-save yet)
    return Response.json({
      success: true,
      data: parsedData,
      message: 'Resume parsed successfully. Review and confirm to import.'
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to process resume'
    }, { status: 500 });
  }
}

/**
 * Confirm and save parsed resume data
 * POST /api/resume/confirm
 */
export async function handleResumeConfirm({ request }: { request: Request }): Promise<Response> {
  try {
    const env = getEnv();

    // Verify user is logged in
    const userId = await getUserIdFromCookie(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json() as { parsedResume: any };
    const { parsedResume } = body;

    if (!parsedResume) {
      return Response.json({ error: 'Missing parsed resume data' }, { status: 400 });
    }

    // Save to database
    await saveParsedResumeToProfile(env.DB, userId, parsedResume);

    return Response.json({
      success: true,
      message: 'Resume data saved successfully'
    });
  } catch (error) {
    console.error('Resume confirm error:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to save resume data'
    }, { status: 500 });
  }
}
