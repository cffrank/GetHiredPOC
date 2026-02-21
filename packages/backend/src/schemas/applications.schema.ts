import { z } from 'zod'

// Matches what the frontend sends: { job_id, status? }
// Frontend api-client: createApplication(job_id, status?)
export const createApplicationSchema = z.object({
  job_id: z.string().min(1, 'job_id is required'),
  status: z.enum(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
})

// Matches UpdateApplicationRequest from shared types
// Frontend updateApplication sends any subset of these fields
export const updateApplicationSchema = z.object({
  status: z.enum(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
  notes: z.string().nullable().optional(),
  ai_match_score: z.number().min(0).max(100).nullable().optional(),
  ai_analysis: z.string().nullable().optional(),
})
