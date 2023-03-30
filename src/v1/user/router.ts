import { Router } from 'express';

import bodyParser from '../../core/middleware/body-parser';
import hasJWT from '../../core/middleware/has-jwt';
import hasRole from '../../core/middleware/has-role';
import hasSession from '../../core/middleware/has-session';
import rateLimit from '../../core/middleware/rate-limit';
import asyncHandler from '../../util/async-handler';
import validate from '../../util/validate';
import AttendanceHandler from '../attendance/router';
import { UserController } from './controller';
import UserValidation from './validation';

/**
 * Handler to take care of 'Users' entity.
 *
 * @returns Express router.
 */
const UserRouter = () => {
  const router = Router();
  const userRateLimit = rateLimit(100, 'users-me', 15);
  const adminRateLimit = rateLimit(30, 'users-admin');

  // Route to 'Attendance' entity based on the current user for better REST-ful experience.
  router.use('/:id/attendances', AttendanceHandler());

  // Below endpoints are allowed for only authenticated users.
  router.use(asyncHandler(hasSession));

  // Allow user to get their own data and update their own data as well.
  router
    .use(userRateLimit)
    .route('/me')
    .get(asyncHandler(UserController.getUser))
    .patch(
      bodyParser,
      validate(UserValidation.updateMe),
      asyncHandler(UserController.updateUser)
    )
    .delete(asyncHandler(UserController.deactivateUser));

  // Restrict endpoints for admins who are logged in and authenticated with MFA.
  router.use(
    adminRateLimit,
    asyncHandler(hasRole('admin')),
    asyncHandler(hasJWT)
  );

  // Perform get and create operations on the general entity.
  router
    .route('/')
    .get(asyncHandler(UserController.getUsers))
    .post(
      bodyParser,
      validate(UserValidation.createUser),
      asyncHandler(UserController.createUser)
    );

  // Perform get, update, and delete operations on a specific entity.
  router
    .route('/:id')
    .get(validate(UserValidation.getUser), asyncHandler(UserController.getUser))
    .patch(
      bodyParser,
      validate(UserValidation.updateUser),
      asyncHandler(UserController.updateUser)
    )
    .delete(
      validate(UserValidation.deleteUser),
      asyncHandler(UserController.deleteUser)
    );

  return router;
};

export default UserRouter;
