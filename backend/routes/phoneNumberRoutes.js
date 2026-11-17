import { Router } from 'express';
import {
  getPhoneNumbers,
  createPhoneNumber,
  deletePhoneNumber,
} from '../controllers/phoneNumberController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext, requireRole } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/phone-numbers - List provisioned phone numbers
router.get('/', getPhoneNumbers);

// 2. POST /api/v1/phone-numbers - Register phone number trunk (admin/owner)
router.post('/', requireRole('admin'), createPhoneNumber);

// 3. DELETE /api/v1/phone-numbers/:id - Release phone number trunk (admin/owner)
router.delete('/:id', requireRole('admin'), deletePhoneNumber);

export default router;
