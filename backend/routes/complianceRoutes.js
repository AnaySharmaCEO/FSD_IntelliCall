import { Router } from 'express';
import {
  getComplianceRules,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
} from '../controllers/complianceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext, requireRole } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/compliance - List all compliance rules
router.get('/', getComplianceRules);

// 2. POST /api/v1/compliance - Create a compliance rule (admin/owner)
router.post('/', requireRole('admin'), createComplianceRule);

// 3. PUT /api/v1/compliance/:id - Update compliance rule (admin/owner)
router.put('/:id', requireRole('admin'), updateComplianceRule);

// 4. DELETE /api/v1/compliance/:id - Delete compliance rule (admin/owner)
router.delete('/:id', requireRole('admin'), deleteComplianceRule);

export default router;
