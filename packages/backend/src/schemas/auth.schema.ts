import { z } from 'zod'

// Matches the fields extracted by the signup handler: email, password
// name/full_name is not extracted by the current handler, so omitted
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// Matches the fields extracted by the login handler: email, password
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})
