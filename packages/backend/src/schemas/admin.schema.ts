import { z } from 'zod'

// Matches fields for PUT /admin/users/:userId/role
export const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Invalid role. Must be "user" or "admin"' }),
  }),
})

// Matches fields for POST /admin/prompts
// Required: prompt_key, prompt_name, prompt_template; Optional: description, model_config, version
export const createPromptSchema = z.object({
  prompt_key: z.string().min(1, 'prompt_key is required'),
  prompt_name: z.string().min(1, 'prompt_name is required'),
  prompt_template: z.string().min(1, 'prompt_template is required'),
  description: z.string().optional(),
  model_config: z.string().optional(), // JSON string — validated separately in handler
  version: z.number().optional(),
})

// Matches fields for PUT /admin/prompts/:key
// All fields are optional for partial update (key comes from URL param)
export const updatePromptSchema = z.object({
  prompt_name: z.string().min(1).optional(),
  prompt_template: z.string().min(1).optional(),
  description: z.string().optional(),
  model_config: z.string().optional(), // JSON string — validated separately in handler
  version: z.number().optional(),
})
