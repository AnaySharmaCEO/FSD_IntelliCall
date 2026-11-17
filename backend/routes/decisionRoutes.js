import { Router } from 'express';
import {
  getDecisions,
  getDecisionById,
  reviewDecision,
} from '../controllers/decisionController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/decisions - List decisions (supports review queue filtering)
router.get('/', getDecisions);

// 2. GET /api/v1/decisions/:id - Retrieve decision details with evidence signals
router.get('/:id', getDecisionById);

// 3. POST /api/v1/decisions/:id/review - Supervisor approval or override
router.post('/:id/review', reviewDecision);

export default router;
