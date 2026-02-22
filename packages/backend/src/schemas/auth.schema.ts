import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  street_address: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be a 2-letter code'),
  zip_code: z.string().min(5, 'Zip code is required'),
})

// Matches the fields extracted by the login handler: email, password
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})
