import { Router } from 'express';

import bodyParser from '../../core/middleware/body-parser';
import hasJWT from '../../core/middleware/has-jwt';
import hasSession from '../../core/middleware/has-session';
import rateLimit from '../../core/middleware/rate-limit';
import asyncHandler from '../../util/async-handler';
import validate from '../../util/validate';
import { AuthController } from './controller';
import AuthValidation from './validation';

/**
 * Handler to take care of 'Authentication' entity. All handlers are specific
 * routes, there are no general routes ('/' or '/:id').
 *
 * @returns Express router.
 */
const AuthRouter = () => {
  const router = Router();
  const authRateLimit = rateLimit(15, 'auth');

  // General endpoint, (almost) no rate limit.
  router.get('/status', AuthController.getStatus);

  // Logs in a single user.
  router.post(
    '/login',
    rateLimit(10, 'auth-login'),
    bodyParser,
    validate(AuthValidation.login),
    asyncHandler(AuthController.login)
  );

  // Logs out a single user.
  router.post('/logout', AuthController.logout);

  // Allow user to forgot their own password.
  router.post(
    '/forgot-password',
    authRateLimit,
    bodyParser,
    validate(AuthValidation.forgotPassword),
    asyncHandler(AuthController.forgotPassword)
  );

  // Sends and verifies OTP.
  router
    .route('/otp')
    .post(
      authRateLimit,
      asyncHandler(hasSession),
      validate(AuthValidation.sendOTP),
      asyncHandler(AuthController.sendOTP)
    )
    .put(
      authRateLimit,
      asyncHandler(hasSession),
      asyncHandler(AuthController.verifyOTP)
    );

  // Registers a single user.
  router.post(
    '/register',
    rateLimit(5, 'auth-register', 30),
    bodyParser,
    validate(AuthValidation.register),
    asyncHandler(AuthController.register)
  );

  // Allows a user to reset their own password.
  router.patch(
    '/reset-password/:token',
    authRateLimit,
    bodyParser,
    validate(AuthValidation.resetPassword),
    asyncHandler(AuthController.resetPassword)
  );

  // Updates MFA for the currently logged in user.
  router.patch(
    '/update-mfa',
    authRateLimit,
    asyncHandler(hasSession),
    asyncHandler(hasJWT),
    asyncHandler(AuthController.updateMFA)
  );

  // Change password for a logged in user.
  router.patch(
    '/update-password',
    rateLimit(2, 'auth-password-update'),
    asyncHandler(hasSession),
    bodyParser,
    validate(AuthValidation.updatePassword),
    asyncHandler(AuthController.updatePassword)
  );

  // Verifies an email.
  router.patch(
    '/verify-email/:code/:email',
    authRateLimit,
    validate(AuthValidation.verifyEmail),
    asyncHandler(AuthController.verifyEmail)
  );

  return router;
};

export default AuthRouter;
