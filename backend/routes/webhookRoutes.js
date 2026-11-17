import { Router } from 'express';
import {
  handleCallWebhook,
  handleAppointmentWebhook,
} from '../controllers/webhookController.js';
import { verifyWebhookSignature } from '../middleware/webhookAuth.js';

const router = Router();

// 1. POST /api/v1/webhooks/calls - Inbound telephony lifecycle & transcript webhook
router.post(
  '/calls',
  verifyWebhookSignature('WEBHOOK_SECRET_VOICE'),
  handleCallWebhook
);

// 2. POST /api/v1/webhooks/appointments - Inbound calendar booking webhook
router.post(
  '/appointments',
  verifyWebhookSignature('WEBHOOK_SECRET_CALENDLY'),
  handleAppointmentWebhook
);

export default router;
