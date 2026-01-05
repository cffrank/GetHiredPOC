// LinkedIn OAuth 2.0 Integration
// Handles LinkedIn profile import with OAuth flow

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  location: {
    country: string;
    city: string;
  };
  positions: Array<{
    title: string;
    company: string;
    description: string;
    startDate: { year: number; month: number };
    endDate?: { year: number; month: number };
    location: string;
  }>;
  educations: Array<{
    schoolName: string;
    degreeName: string;
    fieldOfStudy: string;
    startDate: { year: number };
    endDate?: { year: number };
  }>;
  skills: Array<{
    name: string;
    endorsementCount?: number;
  }>;
  certifications: Array<{
    name: string;
    authority: string;
    startDate: { year: number; month: number };
    endDate?: { year: number; month: number };
    licenseNumber?: string;
    url?: string;
  }>;
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    url?: string;
  }>;
}

/**
 * Initiate LinkedIn OAuth flow
 * Generates authorization URL and stores state in KV for CSRF protection
 */
export async function initiateLinkedInOAuth(env: Env): Promise<string> {
  const clientId = env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${env.APP_URL}/auth/linkedin/callback`;
  const state = crypto.randomUUID(); // CSRF protection

  // Store state in KV (expires in 10 minutes)
  await env.KV_SESSIONS.put(`linkedin_oauth:${state}`, 'pending', {
    expirationTtl: 600
  });

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'openid profile email');

  return authUrl.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeLinkedInCode(
  env: Env,
  code: string,
  state: string
): Promise<string> {
  // Verify state (CSRF protection)
  const storedState = await env.KV_SESSIONS.get(`linkedin_oauth:${state}`);
  if (!storedState) {
    throw new Error('Invalid or expired OAuth state');
  }

  // Delete used state
  await env.KV_SESSIONS.delete(`linkedin_oauth:${state}`);

  // Exchange code for access token
  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: `${env.APP_URL}/auth/linkedin/callback`
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('LinkedIn token exchange error:', errorText);
    throw new Error('Failed to exchange LinkedIn code for token');
  }

  const tokenData = await tokenResponse.json() as { access_token: string };
  return tokenData.access_token;
}

/**
 * Fetch LinkedIn profile data using access token
 */
export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  // Fetch basic profile
  const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();
    console.error('LinkedIn profile fetch error:', errorText);
    throw new Error('Failed to fetch LinkedIn profile');
  }

  const profile = await profileResponse.json() as any;

  // Note: LinkedIn's API v2 has limited endpoints available without partner access
  // For POC, we'll structure the data but may need to mock some fields
  // In production, you'd need LinkedIn Partner Program access for full profile data

  // Parse and normalize data
  return {
    id: profile.id,
    firstName: profile.localizedFirstName || '',
    lastName: profile.localizedLastName || '',
    headline: '', // Not available in basic API
    summary: '', // Not available in basic API
    location: {
      country: '',
      city: ''
    },
    positions: [], // Requires partner access
    educations: [], // Requires partner access
    skills: [], // Requires partner access
    certifications: [], // Requires partner access
    languages: [],
    projects: []
  };
}

/**
 * Save LinkedIn profile data to database
 */
export async function saveLinkedInProfile(
  db: D1Database,
  userId: string,
  linkedInProfile: LinkedInProfile
): Promise<void> {
  // Update user basic info
  await db.prepare(`
    UPDATE users
    SET
      full_name = ?,
      headline = ?
    WHERE id = ?
  `).bind(
    `${linkedInProfile.firstName} ${linkedInProfile.lastName}`,
    linkedInProfile.headline || null,
    userId
  ).run();

  // Save work experience
  for (const position of linkedInProfile.positions) {
    const startDate = `${position.startDate.year}-${String(position.startDate.month).padStart(2, '0')}-01`;
    const endDate = position.endDate
      ? `${position.endDate.year}-${String(position.endDate.month).padStart(2, '0')}-01`
      : null;

    await db.prepare(`
      INSERT INTO work_experience (
        user_id, company, title, description, location, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      position.company,
      position.title,
      position.description,
      position.location,
      startDate,
      endDate
    ).run();
  }

  // Save education
  for (const edu of linkedInProfile.educations) {
    const startDate = `${edu.startDate.year}-01-01`;
    const endDate = edu.endDate ? `${edu.endDate.year}-12-31` : null;

    await db.prepare(`
      INSERT INTO education (
        user_id, school, degree, field_of_study, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      edu.schoolName,
      edu.degreeName,
      edu.fieldOfStudy,
      startDate,
      endDate
    ).run();
  }

  // Update skills (as JSON for now)
  if (linkedInProfile.skills.length > 0) {
    const skills = linkedInProfile.skills.map(s => s.name);
    await db.prepare(`
      UPDATE users SET skills = ? WHERE id = ?
    `).bind(JSON.stringify(skills), userId).run();
  }

  // Save certifications
  for (const cert of linkedInProfile.certifications) {
    const issueDate = `${cert.startDate.year}-${String(cert.startDate.month).padStart(2, '0')}-01`;
    const expiryDate = cert.endDate
      ? `${cert.endDate.year}-${String(cert.endDate.month).padStart(2, '0')}-01`
      : null;

    await db.prepare(`
      INSERT INTO certifications (
        user_id, name, authority, issue_date, expiry_date, credential_id, credential_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      cert.name,
      cert.authority,
      issueDate,
      expiryDate,
      cert.licenseNumber || null,
      cert.url || null
    ).run();
  }

  // Save languages
  for (const lang of linkedInProfile.languages) {
    await db.prepare(`
      INSERT INTO languages (user_id, name, proficiency)
      VALUES (?, ?, ?)
    `).bind(
      userId,
      lang.name,
      lang.proficiency
    ).run();
  }

  // Save projects
  for (const project of linkedInProfile.projects) {
    await db.prepare(`
      INSERT INTO projects (user_id, title, description, url)
      VALUES (?, ?, ?, ?)
    `).bind(
      userId,
      project.title,
      project.description,
      project.url || null
    ).run();
  }
}
