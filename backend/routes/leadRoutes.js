import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
} from '../controllers/leadController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext, requireRole } from '../middleware/orgContext.js';

const router = Router();

// Every Lead endpoint requires valid user authentication followed by active organization context
router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/leads - Fetch all leads belonging to active organization
router.get('/', getLeads);

// 2. POST /api/v1/leads - Create a new lead for active organization
router.post('/', createLead);

// 3. GET /api/v1/leads/:id - Fetch single lead by ID
router.get('/:id', getLeadById);

// 4. PUT /api/v1/leads/:id - Update lead by ID
router.put('/:id', updateLead);

// 5. DELETE /api/v1/leads/:id - Delete lead by ID (restricted to admin or owner role)
router.delete('/:id', requireRole('admin'), deleteLead);

export default router;
