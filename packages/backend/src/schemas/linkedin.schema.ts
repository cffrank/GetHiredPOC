import { z } from 'zod'

// Matches fields extracted by POST /linkedin/parse handler:
// { profileText }
export const linkedinParseSchema = z.object({
  profileText: z
    .string()
    .min(1, 'Profile text is required')
    .max(50000, 'Profile text is too long (max 50,000 characters)'),
})
