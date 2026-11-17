import { asyncHandler } from '../middleware/asyncHandler.js';

const ALLOWED_COMPLIANCE_FIELDS = [
  'name',
  'rule_type',
  'pattern_phrases',
  'threshold_score',
  'breach_action',
  'is_active',
];

/**
 * 1. GET /api/v1/compliance
 * List all regulatory compliance audit rules for active organization.
 */
export const getComplianceRules = asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('compliance_rules')
    .select('*')
    .eq('organization_id', req.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance rules',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    count: data ? data.length : 0,
    rules: data || [],
  });
});

/**
 * 2. POST /api/v1/compliance
 * Create a new regulatory compliance rule.
 */
export const createComplianceRule = asyncHandler(async (req, res) => {
  const body = req.body;

  if (!body.name || !String(body.name).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Rule name is required',
    });
  }

  const newRule = {
    organization_id: req.orgId,
    name: String(body.name).trim(),
    rule_type: body.rule_type || body.ruleType || 'required_phrase',
    pattern_phrases: body.pattern_phrases || body.patternPhrases || [],
    threshold_score:
      body.threshold_score !== undefined
        ? Number(body.threshold_score)
        : body.thresholdScore !== undefined
        ? Number(body.thresholdScore)
        : 85,
    breach_action: body.breach_action || body.breachAction || 'flag',
    is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
  };

  const { data, error } = await req.supabase
    .from('compliance_rules')
    .insert(newRule)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create compliance rule',
      error: error.message,
    });
  }

  res.status(201).json({
    success: true,
    rule: data,
  });
});

/**
 * 3. PUT /api/v1/compliance/:id
 * Update an existing compliance rule.
 */
export const updateComplianceRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = {};

  for (const field of ALLOWED_COMPLIANCE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (req.body.ruleType !== undefined) updates.rule_type = req.body.ruleType;
  if (req.body.patternPhrases !== undefined) updates.pattern_phrases = req.body.patternPhrases;
  if (req.body.thresholdScore !== undefined) updates.threshold_score = Number(req.body.thresholdScore);
  if (req.body.breachAction !== undefined) updates.breach_action = req.body.breachAction;
  if (req.body.isActive !== undefined) updates.is_active = Boolean(req.body.isActive);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid update fields provided',
    });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await req.supabase
    .from('compliance_rules')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update compliance rule',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Compliance rule not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    rule: data,
  });
});

/**
 * 4. DELETE /api/v1/compliance/:id
 * Delete a compliance rule.
 */
export const deleteComplianceRule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('compliance_rules')
    .delete()
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete compliance rule',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Compliance rule not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Compliance rule deleted successfully',
    rule: data,
  });
});

export default {
  getComplianceRules,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
};
