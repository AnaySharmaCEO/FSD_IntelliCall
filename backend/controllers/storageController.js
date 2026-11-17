import { asyncHandler } from '../middleware/asyncHandler.js';
import { supabaseAdmin } from '../config/supabase.js';

const BUCKET_NAME = 'call-recordings';

/**
 * 1. GET /api/v1/storage/recordings/:callId/signed-url
 * Generates a signed download URL for private audio recordings stored in call-recordings bucket.
 */
export const getRecordingSignedUrl = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  // 1. Fetch call record to verify organization ownership and get recording_path
  const { data: call, error: callErr } = await req.supabase
    .from('calls')
    .select('id, organization_id, recording_path')
    .eq('id', callId)
    .eq('organization_id', req.orgId)
    .single();

  if (callErr || !call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found or unauthorized',
    });
  }

  if (!call.recording_path) {
    return res.status(404).json({
      success: false,
      message: 'No audio recording registered for this call',
    });
  }

  // If path is already a full external URL (e.g. Twilio / S3), return directly
  if (call.recording_path.startsWith('http://') || call.recording_path.startsWith('https://')) {
    return res.status(200).json({
      success: true,
      url: call.recording_path,
    });
  }

  // Generate 1-hour signed URL from private call-recordings bucket
  const { data: signedData, error: storageErr } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(call.recording_path, 3600);

  if (storageErr || !signedData?.signedUrl) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate signed recording URL',
      error: storageErr?.message,
    });
  }

  res.status(200).json({
    success: true,
    url: signedData.signedUrl,
  });
});

export default {
  getRecordingSignedUrl,
};
