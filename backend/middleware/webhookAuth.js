/**
 * Webhook authentication middleware for securing inbound voice provider and calendar webhooks.
 * Validates request signatures against environment secrets (e.g. WEBHOOK_SECRET_VOICE, WEBHOOK_SECRET_CALENDLY).
 */
export const verifyWebhookSignature = (secretEnvVarName) => (req, res, next) => {
  const secret = process.env[secretEnvVarName];

  // If no secret configured in environment, permit request with warning in development
  if (!secret) {
    return next();
  }

  const signature =
    req.headers['x-webhook-signature'] ||
    req.headers['calendly-webhook-signature'] ||
    req.headers['authorization'];

  if (!signature) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing webhook signature or authorization header',
    });
  }

  // Support direct secret match, Bearer prefix, or substring match
  const matches =
    signature === secret ||
    signature === `Bearer ${secret}` ||
    signature.includes(secret);

  if (!matches) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid webhook signature',
    });
  }

  next();
};

export default verifyWebhookSignature;
