import { Router } from 'express';
import { getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/auth/me
// Protected by requireAuth only; does NOT require an organization context
router.get('/me', requireAuth, getMe);

export default router;
