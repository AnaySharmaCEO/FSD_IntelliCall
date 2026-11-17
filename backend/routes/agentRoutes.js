import { Router } from 'express';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
} from '../controllers/agentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext, requireRole } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/agents - List voice agents for active organization
router.get('/', getAgents);

// 2. POST /api/v1/agents - Create a new voice agent persona
router.post('/', createAgent);

// 3. GET /api/v1/agents/:id - Retrieve agent by ID
router.get('/:id', getAgentById);

// 4. PUT /api/v1/agents/:id - Update agent persona
router.put('/:id', updateAgent);

// 5. DELETE /api/v1/agents/:id - Delete agent (admin or owner only)
router.delete('/:id', requireRole('admin'), deleteAgent);

export default router;
