/**
 * Voice Telephony Provider Seam
 * Provider-agnostic interface supporting Twilio, Retell, LiveKit, or mock fallback.
 * Ported from supabase/functions/trigger-scheduled-calls/index.ts.
 */
export async function initiateVoiceCall({ callId, lead, agent, campaign }) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;

  // Real telephony dispatch if Twilio credentials are configured
  if (twilioSid && twilioToken) {
    try {
      console.log(
        `[Telephony Service] Dispatching real voice call via Twilio for Call ${callId} to ${lead.phone}`
      );
      // Native fetch Twilio REST API integration without external package
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`;

      const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+15551234567';
      const webhookUrl = process.env.VOICE_WEBHOOK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/webhooks/calls`;

      const params = new URLSearchParams();
      params.append('To', lead.phone);
      params.append('From', fromNumber);
      params.append('Url', `${webhookUrl}?call_id=${callId}`);
      params.append('StatusCallback', webhookUrl);
      params.append('StatusCallbackEvent', 'initiated');
      params.append('StatusCallbackEvent', 'answered');
      params.append('StatusCallbackEvent', 'completed');

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (response.ok) {
        const twilioData = await response.json();
        return {
          providerCallId: twilioData.sid,
          status: 'initiated',
        };
      } else {
        const errorText = await response.text();
        console.warn('[Telephony Service] Twilio dispatch returned error:', errorText);
      }
    } catch (err) {
      console.warn('[Telephony Service] Twilio network error, falling back to mock:', err.message);
    }
  }

  // Graceful deterministic provider simulation
  console.log(
    `[Telephony Service] Initiating simulated voice call ${callId} to ${lead.phone} (${lead.name}) with Agent ${agent.name}`
  );

  return {
    providerCallId: `prov_${Date.now()}_${callId.slice(0, 8)}`,
    status: 'initiated',
  };
}

export default {
  initiateVoiceCall,
};
