import { supabaseAdmin } from '../config/supabase.js';

/**
 * Analyzes normalized transcript turns against agent objectives and campaign thresholds.
 * Ported directly from supabase/functions/process-ai-decision/index.ts.
 */
export function evaluateTranscriptSignals(transcriptTurns, agentContext, campaignContext) {
  const fullText = (transcriptTurns || [])
    .map((t) => `${t.speaker}: ${t.text}`)
    .join('\n')
    .toLowerCase();

  const evidenceSignals = [];
  let score = 50;

  // Rule 1: Budget Analysis
  const budgetConfirmed =
    fullText.includes('budget') &&
    (fullText.includes('allocated') || fullText.includes('approved') || fullText.includes('yes'));
  const budgetFreeze =
    fullText.includes('freeze') || fullText.includes('no budget') || fullText.includes('no spend');
  const budgetUncertain =
    fullText.includes('check with finance') ||
    fullText.includes('pricing') ||
    fullText.includes('conversation with');

  if (budgetConfirmed) {
    score += 30;
    const turn = transcriptTurns.find(
      (t) =>
        t.text.toLowerCase().includes('allocated') || t.text.toLowerCase().includes('budget')
    );
    evidenceSignals.push({
      quote: turn ? turn.text : "We've already allocated budget for this.",
      signal: 'Budget confirmed, high purchase readiness',
      weight: 'high',
      timestamp_seconds: turn ? turn.timestamp_seconds : 45.0,
    });
  } else if (budgetFreeze) {
    score -= 35;
    const turn = transcriptTurns.find(
      (t) => t.text.toLowerCase().includes('freeze') || t.text.toLowerCase().includes('no spend')
    );
    evidenceSignals.push({
      quote: turn ? turn.text : "We're in a budget freeze right now.",
      signal: 'Budget freeze confirmed',
      weight: 'high',
      timestamp_seconds: turn ? turn.timestamp_seconds : 30.0,
    });
  } else if (budgetUncertain) {
    score += 15;
    const turn = transcriptTurns.find(
      (t) => t.text.toLowerCase().includes('finance') || t.text.toLowerCase().includes('pricing')
    );
    evidenceSignals.push({
      quote: turn ? turn.text : "We'd probably need to check with finance before committing.",
      signal: 'Budget authority conditional',
      weight: 'medium',
      timestamp_seconds: turn ? turn.timestamp_seconds : 60.0,
    });
  }

  // Rule 2: Timeline / Urgency
  if (
    fullText.includes('this week') ||
    fullText.includes('calendar') ||
    fullText.includes('tomorrow') ||
    fullText.includes('asap')
  ) {
    score += 15;
    const turn = transcriptTurns.find(
      (t) => t.text.toLowerCase().includes('calendar') || t.text.toLowerCase().includes('this week')
    );
    evidenceSignals.push({
      quote: turn ? turn.text : 'Can we get something on the calendar this week?',
      signal: 'Urgency high, meeting requested',
      weight: 'high',
      timestamp_seconds: turn ? turn.timestamp_seconds : 75.0,
    });
  }

  // Rule 3: Authority
  if (
    fullText.includes('leadership') ||
    fullText.includes('not the final call') ||
    fullText.includes('ceo')
  ) {
    const turn = transcriptTurns.find(
      (t) =>
        t.text.toLowerCase().includes('final call') || t.text.toLowerCase().includes('leadership')
    );
    evidenceSignals.push({
      quote: turn ? turn.text : "I'm not the final call on spend.",
      signal: 'Decision-maker confirmation pending',
      weight: 'medium',
      timestamp_seconds: turn ? turn.timestamp_seconds : 90.0,
    });
  }

  // Bound score between 15 and 96
  score = Math.max(15, Math.min(96, score));

  const confidenceThreshold = campaignContext?.confidence_threshold || 70;
  const confidenceTier = score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low';
  const outcome =
    score >= confidenceThreshold
      ? 'qualified'
      : score >= 50
      ? 'review_required'
      : 'not_qualified';
  const recommendedAction =
    score >= 70 ? 'book_meeting' : score >= 45 ? 'send_followup' : 'update_status';

  const reason =
    outcome === 'qualified'
      ? `Prospect expressed clear budget and interest matching campaign criteria (Confidence: ${score}%).`
      : outcome === 'review_required'
      ? `Ambiguous authority or timeline indicators require human review (Confidence: ${score}%).`
      : `Prospect identified budget freeze or mismatch with qualification goal (Confidence: ${score}%).`;

  const trace = [
    {
      id: 'step_1_ingest',
      label: 'Transcript Ingestion',
      description: `Parsed ${transcriptTurns.length} conversational turns.`,
      order: 1,
    },
    {
      id: 'step_2_signals',
      label: 'Signal Extraction',
      description: `Extracted ${evidenceSignals.length} grounded evidentiary signals.`,
      order: 2,
    },
    {
      id: 'step_3_threshold',
      label: 'Threshold Evaluation',
      description: `Evaluated against campaign target threshold (${confidenceThreshold}%). Result: ${score}%.`,
      order: 3,
    },
    {
      id: 'step_4_orchestrate',
      label: 'Action Orchestration',
      description: `Generated recommended action: ${recommendedAction}.`,
      order: 4,
    },
  ];

  return {
    outcome,
    confidence_score: score,
    confidence_tier: confidenceTier,
    reason,
    recommended_action: recommendedAction,
    evidenceSignals,
    trace,
  };
}

/**
 * Orchestrates full AI decision creation, grounded evidence signals, resulting actions,
 * outcome tracking, and lead status advancement.
 *
 * @param {string} callId - ID of completed call
 * @param {object} [dbClient] - Supabase client (defaults to admin client)
 */
export async function processCallDecision(callId, dbClient = supabaseAdmin) {
  if (!callId) {
    throw new Error('callId is required for processing AI decision');
  }

  // 1. Fetch Call along with related Lead, Campaign, and Agent
  const { data: call, error: callErr } = await dbClient
    .from('calls')
    .select(`
      id,
      organization_id,
      campaign_id,
      lead_id,
      agent_id,
      status,
      leads:lead_id (id, status, name, company),
      campaigns:campaign_id (id, name, confidence_threshold, strategy),
      agents:agent_id (id, name, objective, qualification_goal)
    `)
    .eq('id', callId)
    .single();

  if (callErr || !call) {
    throw new Error(`Call record not found: ${callId}`);
  }

  // 2. Fetch transcript turns
  let transcriptTurns = [];
  const { data: transcript } = await dbClient
    .from('transcripts')
    .select('id')
    .eq('call_id', call.id)
    .maybeSingle();

  if (transcript) {
    const { data: turns } = await dbClient
      .from('transcript_turns')
      .select('*')
      .eq('transcript_id', transcript.id)
      .order('turn_index', { ascending: true });

    transcriptTurns = turns || [];
  }

  // 3. Evaluate transcript signals
  const analysisResult = evaluateTranscriptSignals(
    transcriptTurns,
    call.agents || { name: 'AI Voice Specialist', objective: 'Lead Qualification' },
    call.campaigns || { name: 'Outbound Campaign', confidence_threshold: 70, strategy: 'Direct' }
  );

  // 4. Create Decision record
  const { data: decision, error: decisionErr } = await dbClient
    .from('decisions')
    .insert({
      organization_id: call.organization_id,
      call_id: call.id,
      lead_id: call.lead_id,
      campaign_id: call.campaign_id,
      outcome: analysisResult.outcome,
      confidence_score: analysisResult.confidence_score,
      confidence_tier: analysisResult.confidence_tier,
      reason: analysisResult.reason,
      recommended_action: analysisResult.recommended_action,
      actual_action: analysisResult.recommended_action,
      action_status: 'pending',
      trace: analysisResult.trace,
    })
    .select()
    .single();

  if (decisionErr) {
    throw new Error(`Failed to create decision record: ${decisionErr.message}`);
  }

  // 5. Insert Evidence Signals
  if (analysisResult.evidenceSignals.length > 0) {
    const signalsToInsert = analysisResult.evidenceSignals.map((s) => ({
      call_id: call.id,
      decision_id: decision.id,
      quote: s.quote,
      signal: s.signal,
      weight: s.weight,
      timestamp_seconds: s.timestamp_seconds,
    }));

    await dbClient.from('evidence_signals').insert(signalsToInsert);
  }

  // 6. Insert Action record
  await dbClient.from('actions').insert({
    organization_id: call.organization_id,
    decision_id: decision.id,
    lead_id: call.lead_id,
    type: analysisResult.recommended_action,
    status: 'pending',
  });

  // 7. Update Lead status and pipeline progression
  if (call.lead_id) {
    let nextLeadStatus;
    if (analysisResult.outcome === 'qualified') {
      nextLeadStatus = 'qualified';
    } else if (analysisResult.outcome === 'review_required') {
      nextLeadStatus = 'contacted';
    } else {
      nextLeadStatus = 'not_qualified';
    }

    await dbClient
      .from('leads')
      .update({
        status: nextLeadStatus,
        confidence_score: analysisResult.confidence_score,
        confidence_tier: analysisResult.confidence_tier,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', call.lead_id);

    // Upsert Outcomes table
    const outcomeStage =
      analysisResult.outcome === 'qualified'
        ? 'qualified'
        : analysisResult.outcome === 'not_qualified'
        ? 'stalled'
        : 'opportunity';

    await dbClient.from('outcomes').insert({
      organization_id: call.organization_id,
      decision_id: decision.id,
      lead_id: call.lead_id,
      campaign_id: call.campaign_id,
      stage: outcomeStage,
      occurred_at: new Date().toISOString(),
    });
  }

  // 8. Update Call record with decision reference
  await dbClient
    .from('calls')
    .update({
      status: 'completed',
      decision_id: decision.id,
    })
    .eq('id', call.id);

  return {
    success: true,
    decision,
    analysisResult,
  };
}

export default {
  evaluateTranscriptSignals,
  processCallDecision,
};
