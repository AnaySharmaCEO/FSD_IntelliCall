import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  createLeadsBulk,
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

// 3. POST /api/v1/leads/bulk - Ingest leads in bulk
router.post('/bulk', createLeadsBulk);

// 4. GET /api/v1/leads/:id - Fetch single lead by ID
router.get('/:id', getLeadById);

// 5. PUT /api/v1/leads/:id - Update lead by ID
router.put('/:id', updateLead);

// 6. DELETE /api/v1/leads/:id - Delete lead by ID (restricted to admin or owner role)
router.delete('/:id', requireRole('admin'), deleteLead);

export default router;
