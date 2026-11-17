import { Router } from 'express';
import {
  getCalls,
  getCallById,
  createCall,
  getCallTranscript,
  getCallAnalysis,
  triggerAnalysisForCall,
  dispatchScheduledCallsEndpoint,
} from '../controllers/callController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/calls - List calls with pagination and filters
router.get('/', getCalls);

// 2. POST /api/v1/calls - Create or schedule a call
router.post('/', createCall);

// 3. POST /api/v1/calls/dispatch-scheduled - Manually trigger batch dispatch of due scheduled calls
router.post('/dispatch-scheduled', dispatchScheduledCallsEndpoint);

// 4. GET /api/v1/calls/:id - Retrieve call details
router.get('/:id', getCallById);

// 5. GET /api/v1/calls/:id/transcript - Get transcript turns
router.get('/:id/transcript', getCallTranscript);

// 6. GET /api/v1/calls/:id/analysis - Get post-call analysis
router.get('/:id/analysis', getCallAnalysis);

// 7. POST /api/v1/calls/:id/trigger-analysis - Trigger post-call analysis
router.post('/:id/trigger-analysis', triggerAnalysisForCall);

export default router;
