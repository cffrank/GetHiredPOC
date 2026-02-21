import type { Context } from 'hono'
import type { ZodError } from 'zod'

export function validationHook(
  result: { success: boolean; error?: ZodError },
  c: Context
) {
  if (!result.success && result.error) {
    return c.json({
      error: 'Validation failed',
      issues: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, 400)
  }
}
