import { Router } from 'express';
import {
  getOrganization,
  updateOrganization,
  getMembers,
  inviteMember,
} from '../controllers/organizationController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext, requireRole } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/organizations/current - Fetch active workspace organization
router.get('/current', getOrganization);

// 2. PUT /api/v1/organizations/current - Update workspace settings (admin/owner)
router.put('/current', requireRole('admin'), updateOrganization);

// 3. GET /api/v1/organizations/members - List team members
router.get('/members', getMembers);

// 4. POST /api/v1/organizations/members/invite - Invite new member (admin/owner)
router.post('/members/invite', requireRole('admin'), inviteMember);

export default router;
