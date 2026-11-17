import { asyncHandler } from '../middleware/asyncHandler.js';

const ALLOWED_CAMPAIGN_FIELDS = [
  'name',
  'description',
  'agent_id',
  'status',
  'strategy',
  'confidence_threshold',
  'company_name',
  'motto',
  'offer',
  'primary_pain_point',
  'value_gap',
  'target_audience',
  'calling_hours_start',
  'calling_hours_end',
  'daily_budget',
  'concurrency_limit',
  'timezone',
  'strategy_config',
  'qualification_questions',
  'objection_playbook',
];

/**
 * 1. GET /api/v1/campaigns
 * Fetch all outbound calling campaigns for the active organization.
 */
export const getCampaigns = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('campaigns')
    .select(`
      *,
      agents:agent_id (id, name, voice_model, language)
    `)
    .eq('organization_id', req.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve campaigns',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    count: data ? data.length : 0,
    campaigns: data || [],
  });
});

/**
 * 2. GET /api/v1/campaigns/:id
 * Retrieve a single campaign by ID with associated agent info.
 */
export const getCampaignById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('campaigns')
    .select(`
      *,
      agents:agent_id (id, name, role_title, voice_model, language)
    `)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve campaign',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Campaign not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    campaign: data,
  });
});

/**
 * 3. POST /api/v1/campaigns
 * Create a new outbound campaign.
 */
export const createCampaign = asyncHandler(async (req, res) => {
  const body = req.body;

  if (!body.name || !String(body.name).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Campaign name is required',
    });
  }

  const newCampaign = {
    organization_id: req.orgId,
    created_by: req.user.id,
    agent_id: body.agent_id || body.agentId || null,
    name: String(body.name).trim(),
    description: body.description || '',
    status: body.status || 'draft',
    strategy: body.strategy || 'outbound_qualification',
    confidence_threshold:
      body.confidence_threshold !== undefined
        ? Number(body.confidence_threshold)
        : body.confidenceThreshold !== undefined
        ? Number(body.confidenceThreshold)
        : 70,
    company_name: body.company_name || body.companyName || '',
    motto: body.motto || '',
    offer: body.offer || '',
    primary_pain_point: body.primary_pain_point || body.primaryPainPoint || '',
    value_gap: body.value_gap || body.valueGap || '',
    target_audience: body.target_audience || body.targetAudience || '',
    calling_hours_start: body.calling_hours_start || body.callingHoursStart || '09:00',
    calling_hours_end: body.calling_hours_end || body.callingHoursEnd || '18:00',
    daily_budget: Number(body.daily_budget || body.dailyBudget || 5000),
    concurrency_limit: Number(body.concurrency_limit || body.concurrencyLimit || 5),
    timezone: body.timezone || 'Asia/Kolkata',
    strategy_config: body.strategy_config || body.strategyConfig || {},
    qualification_questions: body.qualification_questions || body.qualificationQuestions || [],
    objection_playbook: body.objection_playbook || body.objectionPlaybook || {},
  };

  const { data, error } = await req.supabase
    .from('campaigns')
    .insert(newCampaign)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message,
    });
  }

  res.status(201).json({
    success: true,
    campaign: data,
  });
});

/**
 * 4. PUT /api/v1/campaigns/:id
 * Update an existing campaign.
 */
export const updateCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = {};

  for (const field of ALLOWED_CAMPAIGN_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Handle camelCase variants
  if (req.body.agentId !== undefined) updates.agent_id = req.body.agentId;
  if (req.body.confidenceThreshold !== undefined) updates.confidence_threshold = Number(req.body.confidenceThreshold);
  if (req.body.companyName !== undefined) updates.company_name = req.body.companyName;
  if (req.body.primaryPainPoint !== undefined) updates.primary_pain_point = req.body.primaryPainPoint;
  if (req.body.valueGap !== undefined) updates.value_gap = req.body.valueGap;
  if (req.body.targetAudience !== undefined) updates.target_audience = req.body.targetAudience;
  if (req.body.callingHoursStart !== undefined) updates.calling_hours_start = req.body.callingHoursStart;
  if (req.body.callingHoursEnd !== undefined) updates.calling_hours_end = req.body.callingHoursEnd;
  if (req.body.dailyBudget !== undefined) updates.daily_budget = Number(req.body.dailyBudget);
  if (req.body.concurrencyLimit !== undefined) updates.concurrency_limit = Number(req.body.concurrencyLimit);
  if (req.body.qualificationQuestions !== undefined) updates.qualification_questions = req.body.qualificationQuestions;
  if (req.body.objectionPlaybook !== undefined) updates.objection_playbook = req.body.objectionPlaybook;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid update fields provided',
    });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await req.supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Campaign not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    campaign: data,
  });
});

/**
 * 5. DELETE /api/v1/campaigns/:id
 * Delete a campaign.
 */
export const deleteCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Campaign not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Campaign deleted successfully',
    campaign: data,
  });
});

export default {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
