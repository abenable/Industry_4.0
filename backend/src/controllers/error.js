import logger from '../utils/logger.js';

class ApiError extends Error {
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Subclass for validation errors
class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(422, message, details); // 422 Unprocessable Entity
  }
}

// Subclass for database errors
class DatabaseError extends ApiError {
  constructor(message, details = null) {
    super(500, message, details);
  }
}

const ErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  // Log the error using your logger
  if (err.isOperational) {
    logger.error(`Operational Error: ${message}`, { statusCode, details, stack: err.stack });
  } else {
    logger.error(`Unexpected Error: ${message}`, { statusCode, details, stack: err.stack });
  }

  // In production, don't expose details or stack traces
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response = {
    status: 'Error',
    error_message: message,
    ...(isDevelopment && details && { details }),
    ...(isDevelopment && err.stack && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

// Helper to handle Prisma errors
const handlePrismaError = (err) => {
  if (err.code === 'P2002') {
    // Unique constraint violation
    return new DatabaseError('A record with this information already exists.', err.meta);
  }
  return new DatabaseError('Database operation failed.', err.message);
};

export { ApiError, ValidationError, DatabaseError, ErrorHandler, handlePrismaError };
