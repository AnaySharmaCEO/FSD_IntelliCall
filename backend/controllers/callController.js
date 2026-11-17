import { asyncHandler } from '../middleware/asyncHandler.js';
import { dispatchDueCalls } from '../services/schedulerService.js';
import { runCallAnalysis } from '../services/aiAnalysisService.js';

/**
 * 1. GET /api/v1/calls
 * List call sessions with pagination and filters (status, sentiment, campaign, agent).
 */
export const getCalls = asyncHandler(async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    status,
    sentiment,
    campaignId,
    agentId,
    search,
    startDate,
    endDate,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const offset = (pageNum - 1) * limit;

  let query = req.supabase
    .from('calls')
    .select(`
      *,
      leads:lead_id (id, name, phone, email, company),
      agents:agent_id (id, name, role_title, voice_model),
      campaigns:campaign_id (id, name)
    `, { count: 'exact' })
    .eq('organization_id', req.orgId);

  if (status) query = query.eq('status', status);
  if (sentiment) query = query.eq('sentiment', sentiment);
  if (campaignId) query = query.eq('campaign_id', campaignId);
  if (agentId) query = query.eq('agent_id', agentId);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve calls',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    count: count || 0,
    page: pageNum,
    pageSize: limit,
    calls: data || [],
  });
});

/**
 * 2. GET /api/v1/calls/:id
 * Retrieve a single call by ID including lead, agent, campaign, and decision details.
 */
export const getCallById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('calls')
    .select(`
      *,
      leads:lead_id (*),
      agents:agent_id (*),
      campaigns:campaign_id (*),
      decisions:decision_id (*),
      call_analyses (*)
    `)
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve call',
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      message: `Call not found with ID: ${id}`,
    });
  }

  res.status(200).json({
    success: true,
    call: data,
  });
});

/**
 * 3. POST /api/v1/calls
 * Create or schedule a new call session.
 */
export const createCall = asyncHandler(async (req, res) => {
  const {
    campaign_id,
    campaignId,
    lead_id,
    leadId,
    agent_id,
    agentId,
    scheduled_for,
    scheduledFor,
    metadata,
  } = req.body;

  const targetCampaignId = campaign_id || campaignId || null;
  const targetLeadId = lead_id || leadId || null;
  const targetAgentId = agent_id || agentId || null;
  const scheduledTime = scheduled_for || scheduledFor || null;

  const newCall = {
    organization_id: req.orgId,
    campaign_id: targetCampaignId,
    lead_id: targetLeadId,
    agent_id: targetAgentId,
    status: scheduledTime ? 'scheduled' : 'calling',
    scheduled_for: scheduledTime,
    started_at: scheduledTime ? null : new Date().toISOString(),
    metadata: metadata || {},
  };

  const { data, error } = await req.supabase
    .from('calls')
    .insert(newCall)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create call session',
      error: error.message,
    });
  }

  res.status(201).json({
    success: true,
    call: data,
  });
});

/**
 * 4. GET /api/v1/calls/:id/transcript
 * Fetch transcript header and ordered conversational turns for a call.
 */
export const getCallTranscript = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify call belongs to organization
  const { data: call, error: callErr } = await req.supabase
    .from('calls')
    .select('id')
    .eq('id', id)
    .eq('organization_id', req.orgId)
    .maybeSingle();

  if (callErr || !call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found in active organization',
    });
  }

  const { data: transcript, error: transErr } = await req.supabase
    .from('transcripts')
    .select('id, language, raw_transcript, created_at')
    .eq('call_id', id)
    .maybeSingle();

  let turns = [];
  if (transcript) {
    const { data: turnData } = await req.supabase
      .from('transcript_turns')
      .select('*')
      .eq('transcript_id', transcript.id)
      .order('turn_index', { ascending: true });

    turns = turnData || [];
  }

  res.status(200).json({
    success: true,
    call_id: id,
    transcript: transcript || null,
    turns,
  });
});

/**
 * 5. GET /api/v1/calls/:id/analysis
 * Fetch the post-call intelligence analysis record for a call.
 */
export const getCallAnalysis = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await req.supabase
    .from('call_analyses')
    .select('*')
    .eq('call_id', id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve call analysis',
      error: error.message,
    });
  }

  res.status(200).json({
    success: true,
    analysis: data || null,
  });
});

/**
 * 6. POST /api/v1/calls/:id/trigger-analysis
 * Trigger on-demand Gemini post-call analysis for a call.
 */
export const triggerAnalysisForCall = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await runCallAnalysis(id, req.supabase);

  res.status(200).json({
    success: true,
    analysisId: result.analysisId,
    analysis: result.analysis,
    callScore: result.callScore,
  });
});

/**
 * 7. POST /api/v1/calls/dispatch-scheduled
 * Manually trigger batch dispatch of due scheduled calls.
 * Translates trigger-scheduled-calls function.
 */
export const dispatchScheduledCallsEndpoint = asyncHandler(async (req, res) => {
  const limit = req.body?.limit ? parseInt(req.body.limit, 10) : 25;
  const result = await dispatchDueCalls(limit);

  res.status(200).json(result);
});

export default {
  getCalls,
  getCallById,
  createCall,
  getCallTranscript,
  getCallAnalysis,
  triggerAnalysisForCall,
  dispatchScheduledCallsEndpoint,
};
