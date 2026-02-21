import { describe, it, expect } from 'vitest';
import { sanitizeField, sanitizeResumeData } from '../../src/utils/sanitize';

describe('sanitizeField — plain text (richText = false)', () => {
  it('passes through normal text unchanged (after trim)', () => {
    expect(sanitizeField('Hello World', 100)).toBe('Hello World');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeField('  hello  ', 100)).toBe('hello');
  });

  it('applies maxLength — truncates at the specified length', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeField(long, 50)).toHaveLength(50);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeField('', 100)).toBe('');
  });

  it('returns empty string for null-like falsy input', () => {
    // TypeScript signature is string, but test the falsy guard in the implementation
    expect(sanitizeField(null as unknown as string, 100)).toBe('');
    expect(sanitizeField(undefined as unknown as string, 100)).toBe('');
  });

  it('does NOT strip HTML tags in plain-text mode (no XSS filter applied)', () => {
    // Plain-text mode: only trim + maxLength; XSS filtering is opt-in via richText=true
    const input = '<b>bold</b>';
    expect(sanitizeField(input, 100)).toBe('<b>bold</b>');
  });
});

describe('sanitizeField — rich text (richText = true)', () => {
  it('strips <script> tags and their content', () => {
    const xss = '<script>alert(1)</script>Safe content';
    const result = sanitizeField(xss, 5000, true);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
    expect(result).toContain('Safe content');
  });

  it('strips inline event handlers (e.g. onerror)', () => {
    const xss = '<img onerror="alert(1)" src="x">text';
    const result = sanitizeField(xss, 5000, true);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<img');
  });

  it('strips <iframe> tags and their content', () => {
    const xss = '<iframe src="evil.com">steal</iframe>ok';
    const result = sanitizeField(xss, 5000, true);
    expect(result).not.toContain('<iframe');
    expect(result).toContain('ok');
  });

  it('preserves allowed formatting tags (b, strong, i, em, ul, li)', () => {
    const richText = '<b>Bold</b> and <em>italic</em> with <ul><li>list</li></ul>';
    const result = sanitizeField(richText, 5000, true);
    expect(result).toContain('<b>Bold</b>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>list</li>');
  });

  it('strips <a> href links (not in whitelist)', () => {
    const xss = '<a href="javascript:alert(1)">click me</a>';
    const result = sanitizeField(xss, 5000, true);
    expect(result).not.toContain('<a ');
    expect(result).not.toContain('javascript:');
  });

  it('applies maxLength after XSS filtering', () => {
    const long = '<b>' + 'a'.repeat(200) + '</b>';
    const result = sanitizeField(long, 50, true);
    // The trimmed result (after XSS) should not exceed 50 chars
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('returns empty string for empty rich text input', () => {
    expect(sanitizeField('', 5000, true)).toBe('');
  });
});

describe('sanitizeResumeData', () => {
  it('sanitizes all plain-text fields', () => {
    const data = {
      fullName: '  Alice  ',
      email: ' alice@example.com ',
      phone: '  555-1234  ',
      location: '  New York  ',
      summary: '',
      workExperience: [],
      education: [],
      skills: [],
    };
    const result = sanitizeResumeData(data);
    expect(result.fullName).toBe('Alice');
    expect(result.email).toBe('alice@example.com');
    expect(result.phone).toBe('555-1234');
    expect(result.location).toBe('New York');
  });

  it('sanitizes the summary as rich text (strips XSS)', () => {
    const data = {
      fullName: 'Alice',
      email: 'alice@example.com',
      phone: '',
      location: '',
      summary: '<script>evil()</script>I am a developer',
      workExperience: [],
      education: [],
      skills: [],
    };
    const result = sanitizeResumeData(data);
    expect(result.summary).not.toContain('<script>');
    expect(result.summary).toContain('I am a developer');
  });

  it('sanitizes workExperience descriptions as rich text', () => {
    const data = {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      workExperience: [
        {
          company: 'Acme',
          title: 'Engineer',
          location: 'SF',
          startDate: '2020',
          endDate: '2022',
          description: '<script>steal()</script>Built systems',
        },
      ],
      education: [],
      skills: [],
    };
    const result = sanitizeResumeData(data);
    expect(result.workExperience[0].description).not.toContain('<script>');
    expect(result.workExperience[0].description).toContain('Built systems');
  });

  it('sanitizes skills array (plain text)', () => {
    const data = {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      workExperience: [],
      education: [],
      skills: ['  TypeScript  ', '<script>evil</script>'],
    };
    const result = sanitizeResumeData(data);
    expect(result.skills[0]).toBe('TypeScript');
    // Skills are plain text — no XSS filtering, just trim+maxLength
    // The script tag content will still be in the output (plain-text mode)
    expect(result.skills[1]).toBe('<script>evil</script>');
  });
});
