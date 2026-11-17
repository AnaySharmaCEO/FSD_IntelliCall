import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * 1. GET /api/v1/organizations/current
 * Retrieve current workspace organization profile.
 */
export const getOrganization = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('organizations')
    .select('*')
    .eq('id', req.orgId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found',
      error: error?.message,
    });
  }

  res.status(200).json({
    success: true,
    organization: data,
  });
});

/**
 * 2. PUT /api/v1/organizations/current
 * Update active organization settings and branding.
 */
export const updateOrganization = asyncHandler(async (req, res) => {
  const { name, slug, settings, onboarding_completed, onboarding_progress } = req.body;

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updates.name = String(name).trim();
  if (slug !== undefined) updates.slug = String(slug).trim().toLowerCase();
  if (settings !== undefined) updates.settings = settings;
  if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed;
  if (onboarding_progress !== undefined) updates.onboarding_progress = onboarding_progress;

  const { data, error } = await req.supabase
    .from('organizations')
    .update(updates)
    .eq('id', req.orgId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update organization',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    organization: data,
  });
});

/**
 * 3. GET /api/v1/organizations/members
 * List all members belonging to the active workspace organization.
 */
export const getMembers = asyncHandler(async (req, res) => {
  const { data: members, error } = await req.supabase
    .from('organization_members')
    .select(`
      id,
      user_id,
      role,
      status,
      created_at,
      profiles:user_id (id, email, name, avatar_url)
    `)
    .eq('organization_id', req.orgId)
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve organization members',
      error: error.message,
    });
  }

  const formattedMembers = (members || []).map((m) => {
    const profile = m.profiles || {};
    return {
      id: m.id,
      userId: m.user_id,
      email: profile.email || 'team@member.internal',
      name: profile.name || (profile.email ? profile.email.split('@')[0] : 'Team Member'),
      role: m.role,
      status: m.status,
      avatarUrl: profile.avatar_url,
      createdAt: m.created_at,
    };
  });

  res.status(200).json({
    success: true,
    count: formattedMembers.length,
    members: formattedMembers,
  });
});

/**
 * 4. POST /api/v1/organizations/members/invite
 * Invite a new user to the organization by email.
 */
export const inviteMember = asyncHandler(async (req, res) => {
  const { email, role = 'member' } = req.body;

  if (!email || !String(email).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Member email is required',
    });
  }

  const targetEmail = String(email).trim().toLowerCase();

  // Find user profile by email if registered
  const { data: existingProfile } = await req.supabase
    .from('profiles')
    .select('id, email')
    .eq('email', targetEmail)
    .maybeSingle();

  const newMemberRecord = {
    organization_id: req.orgId,
    user_id: existingProfile?.id || null,
    role: role,
    status: existingProfile ? 'active' : 'invited',
    invited_by: req.user.id,
  };

  const { data, error } = await req.supabase
    .from('organization_members')
    .insert(newMemberRecord)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to invite team member',
      error: error.message,
    });
  }

  res.status(201).json({
    success: true,
    message: `Invitation successfully created for ${targetEmail}`,
    member: data,
  });
});

export default {
  getOrganization,
  updateOrganization,
  getMembers,
  inviteMember,
};
