import { Hono } from 'hono';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import PizZip from 'pizzip';

const app = new Hono();

export interface ResumeData {
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

export interface CoverLetterData {
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

/**
 * Wrap text to fit within a given width
 */
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateResumePDF(data: ResumeData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPosition = height - 50;
  const margin = 50;
  const lineHeight = 15;

  const drawText = (text: string, size: number, isBold = false, newLine = true) => {
    page.drawText(text, {
      x: margin,
      y: yPosition,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0)
    });
    if (newLine) yPosition -= lineHeight;
  };

  drawText(data.fullName, 20, true);
  yPosition -= 5;

  const contactInfo = [data.email, data.phone, data.location].filter(Boolean).join(' | ');
  drawText(contactInfo, 10, false);
  yPosition -= lineHeight;

  if (data.summary) {
    yPosition -= 5;
    drawText('SUMMARY', 14, true);
    yPosition -= 5;
    const summaryLines = wrapText(data.summary, width - 2 * margin, font, 10);
    summaryLines.forEach(line => drawText(line, 10, false));
    yPosition -= lineHeight;
  }

  if (data.workExperience.length > 0) {
    yPosition -= 5;
    drawText('WORK EXPERIENCE', 14, true);
    yPosition -= 5;

    for (const exp of data.workExperience) {
      if (yPosition < 100) {
        pdfDoc.addPage([612, 792]);
        yPosition = height - 50;
      }

      drawText(`${exp.title} at ${exp.company}`, 11, true);
      yPosition -= 3;

      const dateRange = [exp.startDate, exp.endDate || 'Present'].filter(Boolean).join(' - ');
      const location = exp.location ? ` | ${exp.location}` : '';
      drawText(`${dateRange}${location}`, 9, false);
      yPosition -= 3;

      if (exp.description) {
        const descLines = wrapText(exp.description, width - 2 * margin, font, 10);
        descLines.forEach(line => drawText(line, 10, false));
      }
      yPosition -= lineHeight;
    }
  }

  if (data.education.length > 0) {
    if (yPosition < 150) {
      pdfDoc.addPage([612, 792]);
      yPosition = height - 50;
    }

    yPosition -= 5;
    drawText('EDUCATION', 14, true);
    yPosition -= 5;

    for (const edu of data.education) {
      drawText(edu.school, 11, true);
      yPosition -= 3;

      const degreeInfo = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(', ');
      if (degreeInfo) drawText(degreeInfo, 10, false);

      const dateRange = [edu.startDate, edu.endDate].filter(Boolean).join(' - ');
      if (dateRange) {
        yPosition -= 3;
        drawText(dateRange, 9, false);
      }

      if (edu.gpa) {
        yPosition -= 3;
        drawText(`GPA: ${edu.gpa}`, 9, false);
      }
      yPosition -= lineHeight;
    }
  }

  if (data.skills && data.skills.length > 0) {
    if (yPosition < 100) {
      pdfDoc.addPage([612, 792]);
      yPosition = height - 50;
    }

    yPosition -= 5;
    drawText('SKILLS', 14, true);
    yPosition -= 5;
    drawText(data.skills.join(', '), 10, false);
  }

  return await pdfDoc.save();
}

async function generateResumeDOCX(data: ResumeData): Promise<Uint8Array> {
  const content = `
${data.fullName}
${[data.email, data.phone, data.location].filter(Boolean).join(' | ')}

${data.summary ? 'SUMMARY\n' + data.summary + '\n' : ''}

WORK EXPERIENCE
${data.workExperience.map(exp => `
${exp.title} at ${exp.company}
${[exp.startDate, exp.endDate || 'Present'].filter(Boolean).join(' - ')}${exp.location ? ' | ' + exp.location : ''}
${exp.description || ''}
`).join('\n')}

EDUCATION
${data.education.map(edu => `
${edu.school}
${[edu.degree, edu.fieldOfStudy].filter(Boolean).join(', ')}
${[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}${edu.gpa ? ' | GPA: ' + edu.gpa : ''}
`).join('\n')}

${data.skills && data.skills.length > 0 ? 'SKILLS\n' + data.skills.join(', ') : ''}
  `.trim();

  const zip = new PizZip();

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${content.split('\n').map(line => `
    <w:p>
      <w:r>
        <w:t>${escapeXml(line)}</w:t>
      </w:r>
    </w:p>
    `).join('')}
  </w:body>
</w:document>`);

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  return zip.generate({ type: 'uint8array' });
}

async function generateCoverLetterPDF(data: CoverLetterData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPosition = height - 50;
  const margin = 50;
  const lineHeight = 15;

  const drawText = (text: string, size: number, isBold = false) => {
    page.drawText(text, {
      x: margin,
      y: yPosition,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0)
    });
    yPosition -= lineHeight;
  };

  drawText(data.applicantName, 12, true);
  if (data.applicantAddress) drawText(data.applicantAddress, 10);
  drawText(data.applicantEmail, 10);
  if (data.applicantPhone) drawText(data.applicantPhone, 10);
  yPosition -= lineHeight;

  drawText(data.date, 10);
  yPosition -= lineHeight;

  if (data.hiringManagerName) {
    drawText(data.hiringManagerName, 10);
  }
  drawText(data.companyName, 10);
  yPosition -= lineHeight;

  const greeting = data.hiringManagerName ? `Dear ${data.hiringManagerName},` : 'Dear Hiring Manager,';
  drawText(greeting, 11);
  yPosition -= 5;

  for (const paragraph of data.bodyParagraphs) {
    const lines = wrapText(paragraph, width - 2 * margin, font, 11);
    lines.forEach(line => drawText(line, 11));
    yPosition -= 5;
  }

  yPosition -= lineHeight;
  drawText('Sincerely,', 11);
  yPosition -= lineHeight * 2;
  drawText(data.applicantName, 11);

  return await pdfDoc.save();
}

async function generateCoverLetterDOCX(data: CoverLetterData): Promise<Uint8Array> {
  const greeting = data.hiringManagerName ? `Dear ${data.hiringManagerName},` : 'Dear Hiring Manager,';

  const content = `
${data.applicantName}
${data.applicantAddress || ''}
${data.applicantEmail}
${data.applicantPhone || ''}

${data.date}

${data.hiringManagerName || ''}
${data.companyName}

${greeting}

${data.bodyParagraphs.join('\n\n')}

Sincerely,

${data.applicantName}
  `.trim();

  const zip = new PizZip();

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${content.split('\n').map(line => `
    <w:p>
      <w:r>
        <w:t>${escapeXml(line)}</w:t>
      </w:r>
    </w:p>
    `).join('')}
  </w:body>
</w:document>`);

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  return zip.generate({ type: 'uint8array' });
}

app.post('/generate', async (c) => {
  try {
    const body = await c.req.json<{ type: string; data: any }>();
    const { type, data } = body;

    if (!type || !data) {
      return c.json({ error: 'Missing type or data' }, 400);
    }

    let fileBuffer: Uint8Array;
    let contentType: string;

    switch (type) {
      case 'resume-pdf':
        fileBuffer = await generateResumePDF(data as ResumeData);
        contentType = 'application/pdf';
        break;
      case 'resume-docx':
        fileBuffer = await generateResumeDOCX(data as ResumeData);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'cover-letter-pdf':
        fileBuffer = await generateCoverLetterPDF(data as CoverLetterData);
        contentType = 'application/pdf';
        break;
      case 'cover-letter-docx':
        fileBuffer = await generateCoverLetterDOCX(data as CoverLetterData);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      default:
        return c.json({ error: `Unknown document type: ${type}` }, 400);
    }

    return new Response(fileBuffer, {
      headers: { 'Content-Type': contentType },
    });
  } catch (error: any) {
    console.error('Document worker error:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
