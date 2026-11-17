import { Router } from 'express';
import { runAnalysis, processDecision } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. POST /api/v1/ai/analysis/run - Post-call conversational intelligence (Gemini 2.0 Flash)
router.post('/analysis/run', runAnalysis);

// 2. POST /api/v1/ai/decisions/process - AI decision engine & grounded evidence generation
router.post('/decisions/process', processDecision);

export default router;
