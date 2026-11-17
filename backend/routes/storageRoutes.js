import { Router } from 'express';
import { getRecordingSignedUrl } from '../controllers/storageController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/storage/recordings/:callId/signed-url
router.get('/recordings/:callId/signed-url', getRecordingSignedUrl);

export default router;
