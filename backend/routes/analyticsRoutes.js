import { Router } from 'express';
import { getAnalyticsOverview } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/analytics/overview - Aggregated calling KPIs, funnel, and telemetry
router.get('/overview', getAnalyticsOverview);

export default router;
