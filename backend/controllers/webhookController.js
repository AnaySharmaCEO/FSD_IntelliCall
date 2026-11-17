import { asyncHandler } from '../middleware/asyncHandler.js';
import { supabaseAdmin } from '../config/supabase.js';
import { processCallDecision } from '../services/decisionEngineService.js';
import { runCallAnalysis } from '../services/aiAnalysisService.js';

/**
 * Normalizes vendor-specific webhook payloads (Twilio, LiveKit, Vapi, Retell)
 * into a standard IntelliCall structure.
 * Ported from supabase/functions/handle-call-webhook/index.ts.
 */
function normalizeCallPayload(body) {
  const raw = body.data || body;

  const eventMap = {
    call_started: 'call.started',
    call_analyzed: 'transcript.complete',
    'call.ended': 'call.ended',
    'call.completed': 'call.ended',
    'transcript.turn': 'transcript.turn',
    'transcript.complete': 'transcript.complete',
  };

  const normalizedEvent = eventMap[raw.event || raw.type] || raw.event || 'call.ended';

  const rawTurns = raw.transcript_turns || raw.turns || raw.messages || [];
  const normalizedTurns = rawTurns.map((turn, index) => {
    const spk = String(turn.speaker || turn.role || '').toLowerCase();
    const speaker = spk === 'agent' || spk === 'assistant' || spk === 'bot' ? 'agent' : 'prospect';

    return {
      speaker,
      text: turn.text || turn.content || turn.message || '',
      turn_index: typeof turn.turn_index === 'number' ? turn.turn_index : index,
      timestamp_seconds:
        typeof turn.timestamp_seconds === 'number'
          ? turn.timestamp_seconds
          : turn.start_time
          ? Number(turn.start_time)
          : 0,
      signals: Array.isArray(turn.signals) ? turn.signals : [],
    };
  });

  return {
    event: normalizedEvent,
    call_id: raw.call_id || raw.callId || raw.id,
    status: raw.status,
    duration_seconds: raw.duration_seconds || raw.duration,
    recording_url: raw.recording_url || raw.recording_path || raw.audio_url,
    timestamp: raw.timestamp || new Date().toISOString(),
    transcript_turns: normalizedTurns,
  };
}

/**
 * 1. POST /api/v1/webhooks/calls
 * Ingests voice telephony lifecycle webhooks and transcript payloads.
 * Translates supabase/functions/handle-call-webhook/index.ts.
 */
export const handleCallWebhook = asyncHandler(async (req, res) => {
  const payload = normalizeCallPayload(req.body);

  if (!payload.call_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing call_id in webhook payload',
    });
  }

  // 1. Fetch current call record
  const { data: call, error: callFetchErr } = await supabaseAdmin
    .from('calls')
    .select('id, organization_id, campaign_id, lead_id, agent_id, status')
    .eq('id', payload.call_id)
    .single();

  if (callFetchErr || !call) {
    return res.status(404).json({
      success: false,
      message: `Call not found: ${payload.call_id}`,
    });
  }

  // 2. Process Call Lifecycle Event
  const updateData = {};
  if (payload.event === 'call.started') {
    updateData.status = 'calling';
    updateData.started_at = payload.timestamp || new Date().toISOString();
  } else if (payload.event === 'call.connected') {
    updateData.status = 'connected';
  } else if (payload.event === 'call.ended' || payload.event === 'transcript.complete') {
    updateData.status = 'completed';
    updateData.ended_at = payload.timestamp || new Date().toISOString();
    if (payload.duration_seconds) {
      updateData.duration_seconds = payload.duration_seconds;
    }
    if (payload.recording_url) {
      updateData.recording_path = payload.recording_url;
    }
  } else if (payload.status) {
    updateData.status = payload.status;
  }

  if (Object.keys(updateData).length > 0) {
    await supabaseAdmin.from('calls').update(updateData).eq('id', call.id);
  }

  // 3. Ingest Transcript Turns
  if (payload.transcript_turns && payload.transcript_turns.length > 0) {
    let transcriptId;
    const { data: existingTranscript } = await supabaseAdmin
      .from('transcripts')
      .select('id')
      .eq('call_id', call.id)
      .maybeSingle();

    if (existingTranscript) {
      transcriptId = existingTranscript.id;
    } else {
      const { data: newTranscript, error: transcriptErr } = await supabaseAdmin
        .from('transcripts')
        .insert({ call_id: call.id })
        .select('id')
        .single();

      if (transcriptErr || !newTranscript) {
        throw new Error(`Failed to create transcript: ${transcriptErr?.message}`);
      }
      transcriptId = newTranscript.id;
    }

    const turnsToInsert = payload.transcript_turns.map((t, idx) => ({
      transcript_id: transcriptId,
      speaker: t.speaker,
      turn_index: t.turn_index ?? idx,
      text: t.text || '',
      timestamp_seconds: t.timestamp_seconds ?? 0.0,
      signals: t.signals ?? [],
    }));

    if (payload.event === 'transcript.complete') {
      await supabaseAdmin.from('transcript_turns').delete().eq('transcript_id', transcriptId);
    }

    await supabaseAdmin.from('transcript_turns').insert(turnsToInsert);
  }

  // 4. Trigger AI Pipeline upon call completion
  let aiTriggered = false;
  if (payload.event === 'call.ended' || payload.event === 'transcript.complete') {
    await supabaseAdmin.from('calls').update({ status: 'processing' }).eq('id', call.id);

    // Asynchronously trigger decision evaluation and post-call Gemini analysis in background
    Promise.allSettled([
      processCallDecision(call.id, supabaseAdmin),
      runCallAnalysis(call.id, supabaseAdmin),
    ]).catch((err) => {
      console.error('[Call Webhook] Background AI pipeline error:', err);
    });

    aiTriggered = true;
  }

  res.status(200).json({
    success: true,
    call_id: call.id,
    event: payload.event,
    ai_triggered: aiTriggered,
  });
});

/**
 * 2. POST /api/v1/webhooks/appointments
 * Ingests calendar booking webhooks (Calendly, Cal.com, etc.),
 * matches lead by email, creates appointment, and advances pipeline to 'meeting_booked'.
 * Translates supabase/functions/handle-appointment-webhook/index.ts.
 */
export const handleAppointmentWebhook = asyncHandler(async (req, res) => {
  const body = req.body;
  const eventType = body.event || 'invitee.created';
  const payload = body.payload || body;

  const email = (payload.email || payload.invitee_email || '').toLowerCase().trim();
  const startTime =
    payload.scheduled_event?.start_time || payload.start_time || payload.scheduled_for;
  const externalEventId =
    payload.uri || payload.event || payload.scheduled_event?.uri || payload.event_id || null;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Missing email in appointment webhook payload',
    });
  }

  // 1. Find matching Lead by email
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, organization_id, campaign_id, status')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Cancellation handling
  if (eventType === 'invitee.canceled') {
    if (externalEventId) {
      await supabaseAdmin
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('external_event_id', externalEventId);
    }
    return res.status(200).json({
      success: true,
      message: 'Appointment marked as cancelled',
    });
  }

  // 3. Insert or update Appointment
  const appointmentPayload = {
    organization_id: lead?.organization_id || null,
    lead_id: lead?.id || null,
    title: payload.name ? `Meeting with ${payload.name}` : 'Consultation Call',
    host_name: payload.scheduled_event?.extended_assigned_to?.[0]?.name || 'Sales Representative',
    scheduled_for: startTime || new Date(Date.now() + 86400000).toISOString(),
    duration_minutes: 30,
    status: 'confirmed',
    booking_source: 'calendly',
    external_event_id: externalEventId,
    notes: `Booked via Calendly (${email})`,
  };

  const { data: appointment, error: aptErr } = await supabaseAdmin
    .from('appointments')
    .insert(appointmentPayload)
    .select()
    .single();

  if (aptErr) {
    throw new Error(`Failed to create appointment: ${aptErr.message}`);
  }

  // 4. Advance Lead pipeline status to 'meeting_booked'
  if (lead?.id) {
    await supabaseAdmin
      .from('leads')
      .update({
        status: 'meeting_booked',
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    if (lead.organization_id) {
      await supabaseAdmin.from('outcomes').insert({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        campaign_id: lead.campaign_id,
        stage: 'meeting_booked',
        meeting_booked_at: new Date().toISOString(),
        occurred_at: new Date().toISOString(),
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'Appointment booked and lead funnel advanced successfully',
    appointment,
  });
});

export default {
  handleCallWebhook,
  handleAppointmentWebhook,
};
