export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 'APP_ERROR'
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
