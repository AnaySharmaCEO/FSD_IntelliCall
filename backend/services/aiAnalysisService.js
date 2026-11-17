import { supabaseAdmin } from '../config/supabase.js';

/**
 * Fallback deterministic analysis generator when Gemini API is unavailable or transcript is short.
 * Mirrors the exact fallback implementation from supabase/functions/analysis-run/index.ts.
 */
export function fallbackAnalysis(transcript = '') {
  const lower = String(transcript).toLowerCase();
  const isNegative =
    lower.includes('dispute') ||
    lower.includes('charge') ||
    lower.includes('overcharged') ||
    lower.includes('angry');
  const isPositive =
    lower.includes('agree') ||
    lower.includes('wonderful') ||
    lower.includes('sanction') ||
    lower.includes('proceed');

  return {
    summary: isNegative
      ? 'Customer expressed concern regarding billing fees; issue was addressed with follow-up required.'
      : isPositive
      ? 'Customer showed high qualification interest in financial products and agreed to terms.'
      : 'Standard general customer inquiry completed.',
    sentiment_overall: isNegative ? 'negative' : isPositive ? 'positive' : 'neutral',
    intent_primary: lower.includes('loan')
      ? 'loan_refinancing'
      : lower.includes('dispute')
      ? 'billing_dispute'
      : 'general_query',
    intent_confidence: 0.9,
    resolution_status: isNegative ? 'escalated' : 'resolved',
    satisfaction_score: isNegative ? 2 : isPositive ? 5 : 4,
    compliance_score: isNegative ? 0.8 : 0.98,
    action_items: [
      { text: 'Record conversation notes in CRM', owner: 'agent', status: 'completed' },
    ],
    risk_signals: isNegative
      ? [{ signal: 'churn_risk', severity: 'high', evidence: 'Billing fee disputed', timestamp_seconds: 40 }]
      : [],
  };
}

/**
 * Executes post-call conversation analysis using Google Gemini 2.0 Flash with structured JSON output,
 * persisting results to the call_analyses table and updating the call record with quality scoring.
 *
 * @param {string} callId - ID of the call to analyze
 * @param {object} [dbClient] - Optional request-scoped or admin Supabase client
 * @returns {Promise<object>} Result containing analysis record and calculated call score
 */
export async function runCallAnalysis(callId, dbClient = supabaseAdmin) {
  if (!callId) {
    throw new Error('callId is required for post-call analysis');
  }

  // 1. Fetch Call details
  const { data: call, error: callError } = await dbClient
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single();

  if (callError || !call) {
    throw new Error(`Call record not found: ${callId}`);
  }

  // If transcript isn't directly on call, check transcripts table
  let transcript = call.transcript || '';
  if (!transcript) {
    const { data: turns } = await dbClient
      .from('transcript_turns')
      .select('speaker, text, timestamp_seconds')
      .order('turn_index', { ascending: true });

    if (turns && turns.length > 0) {
      transcript = turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  let analysis;

  if (apiKey && transcript.trim().length > 10) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const prompt = `You are an expert conversational intelligence analyst for financial calling.
Analyze the following call transcript and output strict JSON matching this schema:
{
  "summary": string,
  "sentiment_overall": "positive" | "neutral" | "negative" | "mixed",
  "intent_primary": string,
  "intent_confidence": number (0.0 to 1.0),
  "resolution_status": "resolved" | "escalated" | "pending" | "callback_scheduled",
  "satisfaction_score": integer (1 to 5),
  "compliance_score": number (0.0 to 1.0),
  "action_items": [{"text": string, "owner": "agent"|"system"|"supervisor", "status": "pending"|"completed"}],
  "risk_signals": [{"signal": string, "severity": "low"|"medium"|"high", "evidence": string, "timestamp_seconds": number}]
}

Transcript:
${transcript}`;

      const geminiResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (geminiResp.ok) {
        const geminiData = await geminiResp.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        analysis = JSON.parse(rawText);
      } else {
        console.warn(`Gemini API returned status ${geminiResp.status}, using deterministic fallback.`);
        analysis = fallbackAnalysis(transcript);
      }
    } catch (geminiErr) {
      console.warn('Gemini call failed or timed out, executing deterministic fallback:', geminiErr.message);
      analysis = fallbackAnalysis(transcript);
    }
  } else {
    analysis = fallbackAnalysis(transcript);
  }

  // 2. Upsert into call_analyses table
  const { data: insertedAnalysis, error: insertError } = await dbClient
    .from('call_analyses')
    .upsert(
      {
        call_id: call.id,
        summary: analysis.summary,
        sentiment_overall: analysis.sentiment_overall,
        intent_primary: analysis.intent_primary,
        intent_confidence: analysis.intent_confidence,
        resolution_status: analysis.resolution_status,
        satisfaction_score: analysis.satisfaction_score,
        compliance_score: analysis.compliance_score,
        action_items: analysis.action_items,
        risk_signals: analysis.risk_signals,
      },
      { onConflict: 'call_id' }
    )
    .select()
    .single();

  if (insertError) {
    console.error('Failed to insert call analysis:', insertError);
    throw insertError;
  }

  // 3. Update calls record with sentiment & quality score
  const callScore = Math.round(
    (analysis.compliance_score * 0.4 + (analysis.satisfaction_score / 5) * 0.6) * 100
  );

  await dbClient
    .from('calls')
    .update({
      sentiment: analysis.sentiment_overall,
      call_score: callScore,
    })
    .eq('id', call.id);

  return {
    success: true,
    analysisId: insertedAnalysis.id,
    analysis: insertedAnalysis,
    callScore,
  };
}

export default {
  fallbackAnalysis,
  runCallAnalysis,
};
