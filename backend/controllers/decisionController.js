import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * 1. GET /api/v1/decisions
 * List AI decisions, supporting filtering for the supervisor review queue (e.g. outcome=review_required).
 */
export const getDecisions = asyncHandler(async (req, res) => {
  const { outcome, campaignId, limit = 50 } = req.query;

  let query = req.supabase
    .from('decisions')
    .select(`
      *,
      calls:call_id (id, status, duration_seconds, started_at, sentiment),
      leads:lead_id (id, name, company, phone, email),
      campaigns:campaign_id (id, name)
    `)
    .eq('organization_id', req.orgId)
    .order('created_at', { ascending: false })
    .limit(Math.min(100, parseInt(limit, 10) || 50));

  if (outcome) {
    query = query.eq('outcome', outcome);
  }
  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve decisions',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    count: data ? data.length : 0,
    decisions: data || [],
  });
});

/**
 * 2. GET /api/v1/decisions/:id
 * Retrieve a single decision along with grounded evidence signals.
 */
export const getDecisionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: decision, error } = await req.supabase
    .from('decisions')
    .select(`
      *,
      calls:call_id (*),
      leads:lead_id (*),
      campaigns:campaign_id (*)
    `)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve decision',
      error: error.message,
    });
  }

  if (!decision) {
    return res.status(404).json({
      success: false,
      message: `Decision not found with ID: ${id}`,
    });
  }

  // Fetch grounded evidence signals
  const { data: evidenceSignals } = await req.supabase
    .from('evidence_signals')
    .select('*')
    .eq('decision_id', decision.id)
    .order('timestamp_seconds', { ascending: true });

  res.status(200).json({
    success: true,
    decision: {
      ...decision,
      evidenceSignals: evidenceSignals || [],
    },
  });
});

/**
 * 3. POST /api/v1/decisions/:id/review
 * Supervisor action: approve or override an AI decision in the review queue.
 */
export const reviewDecision = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { outcome, recommended_action, reason, notes } = req.body;

  if (!outcome) {
    return res.status(400).json({
      success: false,
      message: 'Outcome is required (e.g. "qualified", "not_qualified")',
    });
  }

  const updates = {
    outcome,
    reviewed_by: req.user.id,
    reviewed_at: new Date().toISOString(),
    overridden_by: req.user.id,
  };

  if (recommended_action) updates.actual_action = recommended_action;
  if (reason) updates.reason = reason;

  const { data: decision, error } = await req.supabase
    .from('decisions')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .select()
    .maybeSingle();

  if (error || !decision) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update review decision',
      error: error?.message,
    });
  }

  // Update lead status if lead_id exists
  if (decision.lead_id) {
    const newLeadStatus = outcome === 'qualified' ? 'qualified' : 'not_qualified';
    await req.supabase
      .from('leads')
      .update({
        status: newLeadStatus,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', decision.lead_id);
  }

  res.status(200).json({
    success: true,
    message: 'Decision reviewed successfully',
    decision,
  });
});

export default {
  getDecisions,
  getDecisionById,
  reviewDecision,
};
