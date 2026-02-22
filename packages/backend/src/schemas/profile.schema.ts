import { z } from 'zod'

// Matches the JSON body fields extracted by PUT/PATCH /profile handlers
// Frontend updateProfile sends: full_name, bio, location, skills, address, linkedin_url
// Profile also accepts multipart/form-data (handled separately in the route — schema only for JSON branch)
export const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  street_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  skills: z.union([z.array(z.string()), z.string()]).optional(),
  address: z.string().optional(),
  linkedin_url: z.string().url('Invalid URL').optional().or(z.literal('')),
}).passthrough() // Allow extra fields — frontend may send additional fields
