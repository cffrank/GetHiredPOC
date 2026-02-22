import type { Env } from './db.service';
import type { JobData } from './job-import.service';

interface ScrapedJobFields {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary_min: number | null;
  salary_max: number | null;
  remote: boolean;
  contract_time: string | null;
  contract_type: string | null;
}

/**
 * Strip HTML tags, scripts, styles, and excess whitespace to extract text content.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scrape a job posting URL and extract structured job data using Workers AI.
 */
export async function scrapeJobFromUrl(env: Env, url: string): Promise<JobData> {
  // Fetch the page HTML
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
      'Accept': 'text/html',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Strip HTML to plain text and trim to fit model context (~5k chars)
  const text = htmlToText(html).slice(0, 5000);

  // Use Workers AI to extract structured job fields
  const prompt = `Extract job posting fields from this text. Return ONLY valid JSON, no other text.

Fields:
- title (string, required): Job title
- company (string, required): Company name
- location (string): City, State or "Remote"
- description (string): Brief job description (2-3 sentences)
- requirements (string[]): List of requirements/qualifications
- salary_min (number or null): Minimum salary (annual, USD)
- salary_max (number or null): Maximum salary (annual, USD)
- remote (boolean): Whether the job is remote
- contract_time (string or null): "full_time", "part_time", or null
- contract_type (string or null): "permanent", "contract", "temporary", or null

Text:
${text}`;

  const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
  });

  const responseText = typeof aiResponse === 'string'
    ? aiResponse
    : (aiResponse as any).response || JSON.stringify(aiResponse);

  // Extract JSON from the response
  let fields: ScrapedJobFields;
  try {
    // Try parsing the whole response first
    const parsed = JSON.parse(responseText);
    fields = Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    // Try extracting JSON object or array from markdown code blocks or mixed text
    const arrayMatch = responseText.match(/\[[\s\S]*\]/);
    const objMatch = responseText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    const match = objMatch || arrayMatch;
    if (!match) {
      throw new Error(`AI did not return valid JSON. Response: ${responseText.slice(0, 500)}`);
    }
    try {
      const parsed = JSON.parse(match[0]);
      fields = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      throw new Error(`Failed to parse AI JSON. Fragment: ${match[0].slice(0, 300)}`);
    }
  }

  if (!fields.title || !fields.company) {
    throw new Error('AI could not extract required fields (title, company)');
  }

  return {
    title: fields.title,
    company: fields.company,
    location: fields.location || 'Unknown',
    state: null,
    remote: fields.remote ? 1 : 0,
    description: fields.description || '',
    requirements: JSON.stringify(fields.requirements || []),
    salary_min: fields.salary_min ?? null,
    salary_max: fields.salary_max ?? null,
    posted_date: Math.floor(Date.now() / 1000),
    source: 'user-import',
    external_url: url,
    contract_time: fields.contract_time ?? null,
    contract_type: fields.contract_type ?? null,
    category_tag: null,
    category_label: null,
    salary_is_predicted: 0,
    latitude: null,
    longitude: null,
    adref: null,
  };
}
