import { z } from 'zod'

// Matches fields extracted by POST /work-experience handler
// Required: company, title; Optional: location, start_date, end_date, description, resumeId
export const createWorkExperienceSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Title is required'),
  location: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
  resumeId: z.string().optional(),
})

// Matches fields extracted by PUT /work-experience/:id handler
// All fields are optional for partial updates
export const updateWorkExperienceSchema = z.object({
  company: z.string().min(1, 'Company is required').optional(),
  title: z.string().min(1, 'Title is required').optional(),
  location: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
})
