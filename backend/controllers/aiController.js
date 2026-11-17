import { asyncHandler } from '../middleware/asyncHandler.js';
import { runCallAnalysis } from '../services/aiAnalysisService.js';
import { processCallDecision } from '../services/decisionEngineService.js';

/**
 * 1. POST /api/v1/ai/analysis/run
 * Runs Google Gemini 2.0 Flash post-call intelligence analysis on a completed call.
 * Translates supabase/functions/analysis-run/index.ts.
 */
export const runAnalysis = asyncHandler(async (req, res) => {
  const { call_id, callId } = req.body;
  const targetCallId = call_id || callId;

  if (!targetCallId) {
    return res.status(400).json({
      success: false,
      message: 'Parameter call_id is required',
    });
  }

  const result = await runCallAnalysis(targetCallId, req.supabase || undefined);

  res.status(200).json({
    success: true,
    analysisId: result.analysisId,
    analysis: result.analysis,
    callScore: result.callScore,
  });
});

/**
 * 2. POST /api/v1/ai/decisions/process
 * Runs the AI decision engine, evidence signal extraction, and action orchestration.
 * Translates supabase/functions/process-ai-decision/index.ts.
 */
export const processDecision = asyncHandler(async (req, res) => {
  const { call_id, callId } = req.body;
  const targetCallId = call_id || callId;

  if (!targetCallId) {
    return res.status(400).json({
      success: false,
      message: 'Parameter call_id is required',
    });
  }

  const result = await processCallDecision(targetCallId, req.supabase || undefined);

  res.status(200).json({
    success: true,
    decision: result.decision,
    analysisResult: result.analysisResult,
  });
});

export default {
  runAnalysis,
  processDecision,
};
