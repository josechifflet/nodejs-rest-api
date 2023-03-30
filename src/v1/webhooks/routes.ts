import { Router } from 'express';

import rateLimit from '../../core/middleware/rate-limit';
import asyncHandler from '../../util/async-handler';
import { WebhookController } from './controller';

/**
 * Handle all webhook-related endpoints.
 *
 * @returns Express router.
 */
const WebhooksRouter = () => {
  const router = Router();

  // Allow rate limiters.
  router.use(rateLimit(100, 'sessions'));

  router.route('/apify').post(asyncHandler(WebhookController.apifyWebhook));

  return router;
};

export default WebhooksRouter;
