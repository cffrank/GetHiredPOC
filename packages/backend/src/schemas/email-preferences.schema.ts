import { z } from 'zod'

// Matches fields extracted by PUT /email-preferences handler:
// { digestEnabled, statusUpdatesEnabled, remindersEnabled, digestFrequency }
export const updateEmailPreferencesSchema = z.object({
  digestEnabled: z.boolean().optional(),
  statusUpdatesEnabled: z.boolean().optional(),
  remindersEnabled: z.boolean().optional(),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
})
