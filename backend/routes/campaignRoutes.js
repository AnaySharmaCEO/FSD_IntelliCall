import { Router } from 'express';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '../controllers/campaignController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext, requireRole } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/campaigns - List campaigns for active organization
router.get('/', getCampaigns);

// 2. POST /api/v1/campaigns - Create a new campaign
router.post('/', createCampaign);

// 3. GET /api/v1/campaigns/:id - Retrieve campaign by ID
router.get('/:id', getCampaignById);

// 4. PUT /api/v1/campaigns/:id - Update campaign configuration
router.put('/:id', updateCampaign);

// 5. DELETE /api/v1/campaigns/:id - Delete campaign (admin or owner only)
router.delete('/:id', requireRole('admin'), deleteCampaign);

export default router;
