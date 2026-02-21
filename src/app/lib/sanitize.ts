import { filterXSS } from 'xss';
import type { ParsedResume } from './resume-parser';

/**
 * XSS sanitization utility for AI-parsed resume fields (rwsdk app).
 *
 * Uses js-xss with a narrow whitelist to strip script tags, event handlers,
 * and other dangerous content while preserving basic formatting.
 *
 * This is the write-time half of defense-in-depth sanitization.
 * Render-time sanitization is provided by React's automatic JSX escaping.
 */

// Allowed HTML tags for rich text fields (summary, descriptions, achievements).
// NO script, iframe, form, input, a, img, style, or event handlers.
const XSS_OPTIONS = {
  whiteList: {
    b: [],
    strong: [],
    i: [],
    em: [],
    u: [],
    s: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    p: [],
    br: [],
    ul: [],
    ol: [],
    li: [],
  } as Record<string, string[]>,
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe'],
};

/**
 * Sanitize a single field value.
 *
 * For plain-text fields (name, email, phone, location): trim + maxLength only.
 * For rich-text fields: apply XSS filter then maxLength.
 */
export function sanitizeField(value: string, maxLength: number, richText = false): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  let result = value;

  if (richText) {
    result = filterXSS(result, XSS_OPTIONS);
  }

  return result.trim().substring(0, maxLength);
}

/**
 * Sanitize all fields of a ParsedResume before storage or returning to client.
 *
 * Applying at two points (defense in depth per locked user decision):
 * 1. After parseResumeWithAI() returns — before sending to client
 * 2. In handleResumeConfirm — before saving to DB (client may have modified data)
 */
export function sanitizeResumeData(data: ParsedResume): ParsedResume {
  return {
    // Plain-text structured fields
    name: sanitizeField(data.name ?? '', 200),
    email: sanitizeField(data.email ?? '', 255),
    phone: sanitizeField(data.phone ?? '', 50),
    location: sanitizeField(data.location ?? '', 200),
    headline: sanitizeField(data.headline ?? '', 500),

    // Rich text: XSS filter + maxLength
    summary: sanitizeField(data.summary ?? '', 5000, true),

    workExperience: (data.workExperience ?? []).map((exp) => ({
      company: sanitizeField(exp.company ?? '', 300),
      title: sanitizeField(exp.title ?? '', 300),
      location: sanitizeField(exp.location ?? '', 200),
      startDate: sanitizeField(exp.startDate ?? '', 20),
      endDate: sanitizeField(exp.endDate ?? '', 20),
      description: sanitizeField(exp.description ?? '', 3000, true),
      achievements: (exp.achievements ?? []).map((a) =>
        sanitizeField(a ?? '', 1000, true)
      ),
    })),

    education: (data.education ?? []).map((edu) => ({
      school: sanitizeField(edu.school ?? '', 300),
      degree: sanitizeField(edu.degree ?? '', 300),
      fieldOfStudy: sanitizeField(edu.fieldOfStudy ?? '', 300),
      startYear: typeof edu.startYear === 'number' ? edu.startYear : 0,
      endYear: typeof edu.endYear === 'number' ? edu.endYear : 0,
    })),

    skills: (data.skills ?? []).map((s) => sanitizeField(s ?? '', 100)),

    certifications: (data.certifications ?? []).map((cert) => ({
      name: sanitizeField(cert.name ?? '', 300),
      authority: sanitizeField(cert.authority ?? '', 300),
      date: sanitizeField(cert.date ?? '', 20),
    })),

    languages: (data.languages ?? []).map((l) => sanitizeField(l ?? '', 100)),
  };
}
