import { asyncHandler } from './asyncHandler.js';
import { supabase, createAuthenticatedClient } from '../config/supabase.js';

/**
 * Helper to conservatively check if an error represents a network or service availability failure
 * rather than an invalid/expired token.
 *
 * @param {any} err - The error object to inspect
 * @returns {boolean} True if genuine network/service failure, false otherwise
 */
const isNetworkOrServiceError = (err) => {
  if (!err) return false;

  // 1. Supabase Auth retryable fetch error
  if (err.name === 'AuthRetryableFetchError') return true;

  // 2. Explicit 5xx server status codes from the Auth service
  if (typeof err.status === 'number' && err.status >= 500) return true;

  // 3. Low-level fetch / network failures (e.g. Node undici / fetch)
  if (err.name === 'FetchError' || (err instanceof TypeError && /fetch failed/i.test(err.message))) {
    return true;
  }

  // 4. Common network / DNS error codes
  const code = err.code || (err.cause && err.cause.code);
  const networkCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH'];
  if (code && networkCodes.includes(code)) {
    return true;
  }

  // 5. Abort or timeout signals
  if (err.name === 'AbortError' || err.name === 'TimeoutError') {
    return true;
  }

  return false;
};

/**
 * Authentication middleware that validates incoming Bearer JWT tokens.
 * Verifies the token with Supabase Auth, attaches the user object and a per-request
 * authenticated Supabase client (preserving PostgreSQL RLS) to the request object.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check for missing Authorization header
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token required (Bearer format)',
    });
  }

  // 2. Validate Bearer format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
    return res.status(401).json({
      success: false,
      message: 'Malformed authorization header. Expected "Bearer <token>"',
    });
  }

  const token = parts[1].trim();

  // 3. Validate token with Supabase Auth service
  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      if (isNetworkOrServiceError(error)) {
        return res.status(503).json({
          success: false,
          message: 'Authentication service temporarily unavailable. Please try again later.',
        });
      }

      // Conservative default for non-network auth errors (400, 401, 403, bad_jwt, etc.)
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    const user = data?.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    // 4. Attach user, token, and request-scoped authenticated Supabase client
    req.user = user;
    req.token = token;
    req.supabase = createAuthenticatedClient(token);

    next();
  } catch (err) {
    if (isNetworkOrServiceError(err)) {
      return res.status(503).json({
        success: false,
        message: 'Authentication service temporarily unavailable. Please try again later.',
      });
    }

    // Generic server error without leaking internal details or the token
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
});

export default requireAuth;
