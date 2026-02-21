import { z } from 'zod'

// Matches fields extracted by POST /export/cover-letter/:format handler:
// { companyName, jobTitle, hiringManagerName?, bodyParagraphs }
export const coverLetterExportSchema = z.object({
  companyName: z.string().min(1, 'companyName is required'),
  jobTitle: z.string().min(1, 'jobTitle is required'),
  hiringManagerName: z.string().optional(),
  bodyParagraphs: z.array(z.string()).min(1, 'bodyParagraphs array is required'),
})
