import { supabaseAdmin } from '../config/supabase.js';
import { initiateVoiceCall } from './telephonyService.js';

let schedulerInterval = null;

/**
 * Scans database for scheduled calls due for dispatch and initiates outbound voice sessions.
 * Ported from supabase/functions/trigger-scheduled-calls/index.ts.
 */
export async function dispatchDueCalls(limit = 25) {
  const now = new Date().toISOString();

  // 1. Query all calls where status = 'scheduled' and scheduled_for <= now()
  const { data: dueCalls, error: fetchErr } = await supabaseAdmin
    .from('calls')
    .select(`
      id,
      organization_id,
      scheduled_for,
      status,
      leads:lead_id (id, name, phone, company),
      agents:agent_id (id, name, objective, voice_config)
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .limit(limit);

  if (fetchErr) {
    console.error('[Scheduler Service] Failed to query scheduled calls:', fetchErr.message);
    throw new Error(`Failed to query scheduled calls: ${fetchErr.message}`);
  }

  if (!dueCalls || dueCalls.length === 0) {
    return { success: true, processed: 0, message: 'No calls due for dispatch' };
  }

  console.log(`[Scheduler Service] Found ${dueCalls.length} due calls ready for dispatch.`);
  const results = [];

  // 2. Dispatch each due call
  for (const call of dueCalls) {
    const lead = call.leads || {};
    const agent = call.agents || {};

    try {
      const dispatch = await initiateVoiceCall({
        callId: call.id,
        lead: {
          name: lead.name || 'Prospect',
          phone: lead.phone || '',
          company: lead.company,
        },
        agent: {
          name: agent.name || 'AI Voice Agent',
          objective: agent.objective || 'Outbound consultation',
        },
      });

      if (dispatch.status === 'initiated') {
        await supabaseAdmin
          .from('calls')
          .update({
            status: 'calling',
            started_at: new Date().toISOString(),
          })
          .eq('id', call.id);

        results.push({ call_id: call.id, status: 'calling', provider_id: dispatch.providerCallId });
      } else {
        await supabaseAdmin
          .from('calls')
          .update({ status: 'failed' })
          .eq('id', call.id);

        results.push({ call_id: call.id, status: 'failed' });
      }
    } catch (err) {
      console.error(`[Scheduler Service] Error dispatching call ${call.id}:`, err);
      results.push({ call_id: call.id, status: 'error', error: err.message });
    }
  }

  return {
    success: true,
    processed: results.length,
    results,
  };
}

/**
 * Starts a native recurring background interval to poll and dispatch due calls.
 * Replaces cloud cron without requiring third-party libraries.
 *
 * @param {number} intervalMs - Polling interval in ms (default: 60,000ms / 1 min)
 */
export function startCallScheduler(intervalMs = 60000) {
  if (schedulerInterval) return;

  console.log(`[Scheduler Service] Initialized background call dispatcher (interval: ${intervalMs}ms)`);
  schedulerInterval = setInterval(async () => {
    try {
      await dispatchDueCalls(25);
    } catch (err) {
      console.error('[Scheduler Service Interval Error]', err.message);
    }
  }, intervalMs);

  // Prevent scheduler interval from holding process open if running tests or clean shutdown
  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }
}

export function stopCallScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export default {
  dispatchDueCalls,
  startCallScheduler,
  stopCallScheduler,
};
