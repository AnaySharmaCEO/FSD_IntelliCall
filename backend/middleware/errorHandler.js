/**
 * Global centralized error-handling middleware for Express.
 * Catches all errors forwarded via next(err), formats a clean JSON response,
 * and assigns an appropriate HTTP status code.
 *
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
export const errorHandler = (err, req, res, next) => {
  // Use status code set on response or custom error object, fallback to 500
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  // Return standardized JSON response
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
