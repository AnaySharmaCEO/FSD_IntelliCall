import { asyncHandler } from '../middleware/asyncHandler.js';

// Whitelist of fields permitted for update operations
const ALLOWED_UPDATE_FIELDS = [
  'name',
  'first_name',
  'last_name',
  'company',
  'title',
  'email',
  'phone',
  'status',
  'source',
  'campaign_id',
  'owner_id',
  'notes',
  'estimated_value',
  'next_action',
  'confidence_score',
  'confidence_tier',
];

/**
 * 1. GET /api/v1/leads
 * Fetch all leads belonging to the authenticated user's organization.
 */
export const getLeads = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('leads')
    .select('*')
    .eq('organization_id', req.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leads',
    });
  }

  res.status(200).json({
    success: true,
    count: data ? data.length : 0,
    leads: data || [],
  });
});

/**
 * 2. GET /api/v1/leads/:id
 * Fetch a single lead by ID, strictly scoped to the active organization.
 */
export const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve lead',
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Lead not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    lead: data,
  });
});

/**
 * 3. POST /api/v1/leads
 * Create a new lead scoped to the active organization.
 * organization_id is always assigned from req.orgId (never trusted from request body).
 * created_by is assigned from req.user.id.
 */
export const createLead = asyncHandler(async (req, res) => {
  const {
    name,
    first_name,
    last_name,
    company,
    title,
    email,
    phone,
    status,
    source,
    campaign_id,
    owner_id,
    notes,
    estimated_value,
    next_action,
  } = req.body;

  // Validate that a name or first_name is provided
  const fullName = (name || `${first_name || ''} ${last_name || ''}`).trim();
  if (!fullName) {
    return res.status(400).json({
      success: false,
      message: 'Lead name is required (provide "name" or "first_name")',
    });
  }

  // Construct database payload using confirmed schema columns
  const newLead = {
    organization_id: req.orgId, // Enforced from tenant context
    created_by: req.user.id,     // Enforced from authenticated user identity
    name: fullName,
    first_name: first_name ? String(first_name).trim() : (fullName.split(' ')[0] || null),
    last_name: last_name ? String(last_name).trim() : (fullName.split(' ').slice(1).join(' ') || null),
    company: company ? String(company).trim() : '',
    title: title ? String(title).trim() : '',
    email: email ? String(email).trim() : '',
    phone: phone ? String(phone).trim() : '',
    status: status || 'new',
    source: source || null,
    campaign_id: campaign_id || null,
    owner_id: owner_id || null,
    notes: notes || null,
    estimated_value: estimated_value !== undefined ? Number(estimated_value) : 0,
    next_action: next_action || null,
  };

  const { data, error } = await req.supabase
    .from('leads')
    .insert(newLead)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create lead',
    });
  }

  res.status(201).json({
    success: true,
    lead: data,
  });
});

/**
 * 4. PUT /api/v1/leads/:id
 * Update an existing lead, strictly scoped to the active organization.
 * Prevents modifying organization_id or id.
 */
export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Filter incoming body to permitted update fields only
  const updates = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid update fields provided',
    });
  }

  // Synchronize name if first_name / last_name updated or vice versa
  if (updates.name && !updates.first_name) {
    const parts = String(updates.name).trim().split(' ');
    updates.first_name = parts[0] || '';
    updates.last_name = parts.slice(1).join(' ') || '';
  }

  // Update last_activity_at timestamp
  updates.last_activity_at = new Date().toISOString();

  const { data, error } = await req.supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update lead',
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Lead not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    lead: data,
  });
});

/**
 * 5. DELETE /api/v1/leads/:id
 * Delete a lead, strictly scoped to the active organization.
 */
export const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete lead',
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Lead not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Lead deleted successfully',
    lead: data,
  });
});

/**
 * 6. POST /api/v1/leads/bulk
 * Ingest multiple leads in a single batch insert.
 */
export const createLeadsBulk = asyncHandler(async (req, res) => {
  const { leads } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Array of leads is required',
    });
  }

  const leadsToInsert = leads.map((item) => {
    const fullName = (item.name || `${item.first_name || item.firstName || ''} ${item.last_name || item.lastName || ''}`).trim() || 'New Lead';
    return {
      organization_id: req.orgId,
      created_by: req.user.id,
      name: fullName,
      first_name: item.first_name || item.firstName || fullName.split(' ')[0] || null,
      last_name: item.last_name || item.lastName || fullName.split(' ').slice(1).join(' ') || null,
      company: item.company || '',
      title: item.title || '',
      email: item.email || '',
      phone: item.phone || '',
      status: item.status || 'new',
      source: item.source || 'bulk_import',
      campaign_id: item.campaign_id || item.campaignId || null,
      estimated_value: item.estimated_value !== undefined ? Number(item.estimated_value) : 0,
      next_action: item.next_action || item.nextAction || null,
    };
  });

  const { data, error } = await req.supabase
    .from('leads')
    .insert(leadsToInsert)
    .select();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk insert leads',
      error: error.message,
    });
  }

  res.status(201).json({
    success: true,
    count: data ? data.length : 0,
    leads: data || [],
  });
});

export default {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  createLeadsBulk,
};
