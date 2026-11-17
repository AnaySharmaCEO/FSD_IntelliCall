import { Router } from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrgContext } from '../middleware/orgContext.js';

const router = Router();

router.use(requireAuth, requireOrgContext);

// 1. GET /api/v1/appointments - List appointments/callbacks
router.get('/', getAppointments);

// 2. POST /api/v1/appointments - Create a new appointment
router.post('/', createAppointment);

// 3. GET /api/v1/appointments/:id - Retrieve appointment details
router.get('/:id', getAppointmentById);

// 4. PUT /api/v1/appointments/:id - Update appointment
router.put('/:id', updateAppointment);

// 5. DELETE /api/v1/appointments/:id - Delete appointment
router.delete('/:id', deleteAppointment);

export default router;
