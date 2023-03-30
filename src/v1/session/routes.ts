import { Router } from 'express';

import getMe from '../../core/middleware/get-me';
import hasRole from '../../core/middleware/has-role';
import hasSession from '../../core/middleware/has-session';
import rateLimit from '../../core/middleware/rate-limit';
import asyncHandler from '../../util/async-handler';
import validate from '../../util/validate';
import { SessionController } from './controller';
import SessionValidation from './validation';

/**
 * Handle all session-related endpoints.
 *
 * @returns Express router.
 */
const SessionRouter = () => {
  const router = Router();

  // Allow rate limiters.
  router.use(rateLimit(100, 'sessions'));

  // Only allow below handlers for authenticated users.
  router.use(asyncHandler(hasSession));

  // Check personal sessions.
  router
    .route('/me')
    .get(getMe, asyncHandler(SessionController.getUserSessions));

  // Allow self session invalidation.
  router
    .route('/me/:id')
    .delete(
      validate(SessionValidation.deleteUserSession),
      asyncHandler(SessionController.deleteMySession)
    );

  // Only allow administrators.
  router.use(asyncHandler(hasRole('admin')));

  // Only allow session checking and session invalidation (admins).
  router.route('/').get(asyncHandler(SessionController.getAllSessions));

  // Allow session invalidation.
  router
    .route('/:id')
    .delete(
      validate(SessionValidation.deleteSession),
      asyncHandler(SessionController.deleteSession)
    );

  return router;
};

export default SessionRouter;
