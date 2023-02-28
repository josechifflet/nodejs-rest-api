import { Router } from 'express';

import bodyParser from '../../core/middleware/body-parser';
import hasMasterUserSession from '../../core/middleware/has-masteruser-session';
import hasProfileSession from '../../core/middleware/has-profile-session';
import rateLimit from '../../core/middleware/rate-limit';
import asyncHandler from '../../util/async-handler';
import validate from '../../util/validate';
import { ProfileAuthController } from './controller';
import AuthValidation from './validation';

/**
 * Handler to take care of 'Authentication' entity. All handlers are specific
 * routes, there are no general routes ('/' or '/:id').
 *
 * @returns Express router.
 */
const AuthProfileRouter = () => {
  const router = Router();
  const authProfileRateLimit = rateLimit(15, 'auth-profile');

  // Below endpoints are allowed for only masterusers.
  router.use(asyncHandler(hasMasterUserSession));

  // General endpoint, (almost) no rate limit.
  router.get(
    '/status',
    asyncHandler(hasProfileSession),
    asyncHandler(ProfileAuthController.getStatus)
  );

  router.post(
    '/login',
    rateLimit(10, 'auth-profile-login'),
    bodyParser,
    validate(AuthValidation.login),
    asyncHandler(ProfileAuthController.login)
  );

  // Logs out a single user.
  router.post(
    '/logout',
    asyncHandler(hasProfileSession),
    ProfileAuthController.logout
  );

  // Allow user to forgot their own password.
  router.post(
    '/forgot-password',
    authProfileRateLimit,
    bodyParser,
    validate(AuthValidation.forgotPassword),
    asyncHandler(ProfileAuthController.forgotPassword)
  );

  // Allows a user to reset their own password.
  router.patch(
    '/reset-password/:token',
    authProfileRateLimit,
    bodyParser,
    validate(AuthValidation.resetPassword),
    asyncHandler(ProfileAuthController.resetPassword)
  );

  // Change password for a logged in user.
  router.patch(
    '/update-password',
    rateLimit(2, 'auth-profile-password-update'),
    asyncHandler(hasProfileSession),
    bodyParser,
    validate(AuthValidation.updatePassword),
    asyncHandler(ProfileAuthController.updatePassword)
  );

  return router;
};

export default AuthProfileRouter;
