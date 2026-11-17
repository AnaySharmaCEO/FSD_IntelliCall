/**
 * Asynchronous error handling wrapper for Express route handlers and middleware.
 * Catches any rejected promises and forwards them to Express error handling via next().
 *
 * @param {Function} fn - Asynchronous route handler or controller function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
