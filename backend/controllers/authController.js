import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * Controller to retrieve authenticated user information.
 * GET /api/v1/auth/me
 *
 * Returns the verified user identity from Supabase Auth.
 * Organization context remains null for this endpoint so newly registered
 * users in onboarding can access their identity before workspace creation.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  // Extract name from verified user metadata, falling back to email prefix or 'User'
  const metadata = user.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    (user.email ? user.email.split('@')[0] : 'User');

  res.status(200).json({
    success: true,
    user: {
      id: user.id,
      email: user.email || '',
      name,
    },
    organization: null,
  });
});

export default {
  getMe,
};
