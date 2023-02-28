import { Router } from 'express';

import bodyParser from '../../core/middleware/body-parser';
import hasJWT from '../../core/middleware/has-jwt';
import hasMasterUserSession from '../../core/middleware/has-masteruser-session';
import hasRole from '../../core/middleware/has-role';
import rateLimit from '../../core/middleware/rate-limit';
import asyncHandler from '../../util/async-handler';
import validate from '../../util/validate';
import AttendanceHandler from '../attendance/router';
import { MasterUserController } from './controller';
import UserValidation from './validation';

/**
 * Handler to take care of 'Users' entity.
 *
 * @returns Express router.
 */
const UserRouter = () => {
  const router = Router();
  const userRateLimit = rateLimit(100, 'masterusers-me', 15);
  const adminRateLimit = rateLimit(30, 'masterusers-admin');

  // Route to 'Attendance' entity based on the current user for better REST-ful experience.
  router.use('/:id/attendances', AttendanceHandler());

  // Below endpoints are allowed for only authenticated masterusers.
  router.use(asyncHandler(hasMasterUserSession));

  // Allow user to get their own data and update their own data as well.
  router
    .use(userRateLimit)
    .route('/me')
    .get(asyncHandler(MasterUserController.getMasterUser))
    .patch(
      bodyParser,
      validate(UserValidation.updateMe),
      asyncHandler(MasterUserController.updateMasterUser)
    )
    .delete(asyncHandler(MasterUserController.deactivateMasterUser));

  // Restrict endpoints for admins who are logged in and authenticated with MFA.
  router.use(
    adminRateLimit,
    asyncHandler(hasRole('admin')),
    asyncHandler(hasJWT)
  );

  // Perform get and create operations on the general entity.
  router
    .route('/')
    .get(asyncHandler(MasterUserController.getMasterUsers))
    .post(
      bodyParser,
      validate(UserValidation.createUser),
      asyncHandler(MasterUserController.createMasterUser)
    );

  // Perform get, update, and delete operations on a specific entity.
  router
    .route('/:id')
    .get(
      validate(UserValidation.getUser),
      asyncHandler(MasterUserController.getMasterUser)
    )
    .patch(
      bodyParser,
      validate(UserValidation.updateUser),
      asyncHandler(MasterUserController.updateMasterUser)
    )
    .delete(
      validate(UserValidation.deleteUser),
      asyncHandler(MasterUserController.deleteMasterUser)
    );

  return router;
};

export default UserRouter;
