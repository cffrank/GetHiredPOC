import { z } from 'zod'

// Matches the Partial<Omit<JobSearchPreferences, 'userId' | 'createdAt' | 'updatedAt'>> accepted
// by updateJobSearchPreferences service. Using passthrough() since the full preferences object
// may include many optional fields and the service does field-by-field conditionals.
export const updateJobPreferencesSchema = z.object({
  desiredJobTitles: z.array(z.string()).optional(),
  workLocations: z.array(z.string()).optional(),
  workMode: z.enum(['remote', 'hybrid', 'onsite', 'any']).optional(),
  industries: z.array(z.string()).optional(),
  employmentStatus: z.enum(['unemployed-urgent', 'unemployed-relaxed', 'badly-employed', 'employed-open']).optional(),
  availabilityDate: z.string().nullable().optional(),
  willingToRelocate: z.boolean().optional(),
  requiresVisaSponsorship: z.enum(['yes', 'no', 'prefer-not-to-say']).optional(),
  hasDriversLicense: z.enum(['yes', 'no', 'prefer-not-to-say']).optional(),
  hasSecurityClearance: z.enum(['yes', 'no', 'prefer-not-to-say']).optional(),
  genderIdentity: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say', 'self-describe']).optional(),
  genderSelfDescribe: z.string().optional(),
  hasDisability: z.enum(['yes', 'no', 'prefer-not-to-say']).optional(),
  onboardingCompleted: z.boolean().optional(),
}).passthrough()
