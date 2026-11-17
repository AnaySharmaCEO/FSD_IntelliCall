import { asyncHandler } from './asyncHandler.js';

/** Supported roles matching SQL has_org_role() */
const ALLOWED_ROLES = ['owner', 'admin', 'member'];

/**
 * Helper to conservatively check if a database error represents a network or availability failure
 * rather than a query/logic failure.
 *
 * @param {any} err - The error object to inspect
 * @returns {boolean} True if network/availability failure, false otherwise
 */
const isDatabaseNetworkError = (err) => {
  if (!err) return false;
  if (err.status === 503 || err.name === 'AuthRetryableFetchError' || err.name === 'FetchError') {
    return true;
  }
  if (err.message && /network|fetch failed|timeout/i.test(err.message)) {
    return true;
  }
  const code = err.code || (err.cause && err.cause.code);
  const networkCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH'];
  return !!(code && networkCodes.includes(code));
};

/**
 * Organization context middleware that validates the caller's active workspace membership.
 * Must run after requireAuth. Reads the organization ID from the X-Org-Id header,
 * verifies active membership using req.supabase (preserving PostgreSQL RLS), and attaches
 * req.orgId and req.userRole to the request object.
 */
export const requireOrgContext = asyncHandler(async (req, res, next) => {
  // 1. Ensure requireAuth ran first
  if (!req.user || !req.supabase) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error: requireOrgContext must be preceded by requireAuth',
    });
  }

  // 2. Read organization ID from X-Org-Id request header
  const orgId = req.headers['x-org-id'] || req.header('X-Org-Id');

  if (!orgId || !String(orgId).trim()) {
    return res.status(400).json({
      success: false,
      message: 'X-Org-Id header is required',
    });
  }

  const targetOrgId = String(orgId).trim();

  // 3. Query organization_members using authenticated req.supabase (RLS-preserved)
  try {
    const { data: member, error } = await req.supabase
      .from('organization_members')
      .select('user_id, organization_id, role, status')
      .eq('user_id', req.user.id)
      .eq('organization_id', targetOrgId)
      .eq('status', 'active')
      .maybeSingle();

    // Differentiate database/network errors from missing membership
    if (error) {
      const isNetwork = isDatabaseNetworkError(error);
      return res.status(isNetwork ? 503 : 500).json({
        success: false,
        message: isNetwork
          ? 'Database service temporarily unavailable. Please try again later.'
          : 'Database error while verifying organization membership',
      });
    }

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not an active member of this organization',
      });
    }

    // 4. Attach verified organization ID and role to request
    req.orgId = member.organization_id;
    req.userRole = member.role;

    next();
  } catch (err) {
    const isNetwork = isDatabaseNetworkError(err);
    return res.status(isNetwork ? 503 : 500).json({
      success: false,
      message: isNetwork
        ? 'Database service temporarily unavailable. Please try again later.'
        : 'Database error while verifying organization membership',
    });
  }
});

/**
 * Role-based authorization middleware mirroring the exact SQL logic of has_org_role().
 * Supported roles: 'owner', 'admin', 'member'.
 * - 'owner': Requires req.userRole === 'owner'.
 * - 'admin': Requires req.userRole === 'owner' || req.userRole === 'admin'.
 * - 'member': Satisfied by any verified active role in the organization.
 *
 * If an unsupported requiredRole is supplied, rejects safely with 500 instead of calling next().
 *
 * @param {'owner' | 'admin' | 'member'} requiredRole - Required minimum role
 * @returns {import('express').RequestHandler} Express middleware
 */
export const requireRole = (requiredRole) => (req, res, next) => {
  // 1. Validate that requiredRole is one of the supported roles
  if (!ALLOWED_ROLES.includes(requiredRole)) {
    return res.status(500).json({
      success: false,
      message: `Configuration error: Unsupported required role "${requiredRole}". Allowed roles are: ${ALLOWED_ROLES.join(', ')}`,
    });
  }

  // 2. Ensure user has a valid active organization role
  if (!req.userRole) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: No active organization role found',
    });
  }

  // 3. Evaluate exact SQL logic matching has_org_role()
  if (requiredRole === 'owner') {
    if (req.userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Owner role required for this action',
      });
    }
  } else if (requiredRole === 'admin') {
    if (req.userRole !== 'owner' && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin or owner role required for this action',
      });
    }
  } else if (requiredRole === 'member') {
    // In SQL has_org_role, min_role = 'member' returns true for any active member
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Active membership required',
      });
    }
  }

  next();
};

export default requireOrgContext;
