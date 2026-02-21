import { z } from 'zod'

// Matches fields extracted by POST /education handler
// Required: school; Optional: degree, field_of_study, start_date, end_date, gpa, resume_id
export const createEducationSchema = z.object({
  school: z.string().min(1, 'School is required'),
  degree: z.string().optional(),
  field_of_study: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  gpa: z.string().optional(),
  resume_id: z.string().optional(),
})

// Matches fields extracted by PUT /education/:id handler
export const updateEducationSchema = z.object({
  school: z.string().min(1, 'School is required').optional(),
  degree: z.string().nullable().optional(),
  field_of_study: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  gpa: z.string().nullable().optional(),
})
