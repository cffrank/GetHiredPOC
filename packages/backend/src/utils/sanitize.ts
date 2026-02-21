import { filterXSS } from 'xss';
import type { ParsedResume } from '@gethiredpoc/shared';

/**
 * XSS sanitization utility for AI-parsed resume fields.
 *
 * Uses js-xss with a narrow whitelist to strip script tags, event handlers,
 * and other dangerous content while preserving basic formatting.
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
 * Sanitize all fields of a ParsedResume (from @gethiredpoc/shared) before storage.
 *
 * Plain-text fields: trim + maxLength.
 * Rich-text fields (summary, descriptions): XSS filter + maxLength.
 *
 * This is the write-time half of defense-in-depth sanitization.
 */
export function sanitizeResumeData(data: ParsedResume): ParsedResume {
  return {
    // Plain-text structured fields
    fullName: sanitizeField(data.fullName ?? '', 200),
    email: sanitizeField(data.email ?? '', 255),
    phone: sanitizeField(data.phone ?? '', 50),
    location: sanitizeField(data.location ?? '', 200),

    // Rich text: XSS filter + maxLength
    summary: sanitizeField(data.summary ?? '', 5000, true),

    workExperience: (data.workExperience ?? []).map((exp) => ({
      company: sanitizeField(exp.company ?? '', 300),
      title: sanitizeField(exp.title ?? '', 300),
      location: sanitizeField(exp.location ?? '', 200),
      startDate: sanitizeField(exp.startDate ?? '', 20),
      endDate: sanitizeField(exp.endDate ?? '', 20),
      description: sanitizeField(exp.description ?? '', 3000, true),
    })),

    education: (data.education ?? []).map((edu) => ({
      school: sanitizeField(edu.school ?? '', 300),
      degree: sanitizeField(edu.degree ?? '', 300),
      fieldOfStudy: sanitizeField(edu.fieldOfStudy ?? '', 300),
      startDate: sanitizeField(edu.startDate ?? '', 20),
      endDate: sanitizeField(edu.endDate ?? '', 20),
      gpa: sanitizeField(edu.gpa ?? '', 50),
    })),

    skills: (data.skills ?? []).map((s) => sanitizeField(s ?? '', 100)),
  };
}
