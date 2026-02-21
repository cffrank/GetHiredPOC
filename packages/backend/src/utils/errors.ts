export function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, message); }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') { super(400, message); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, message); }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(401, message); }
}
