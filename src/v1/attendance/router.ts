import { Router } from 'express';

import bodyParser from '../../core/middleware/body-parser';
import hasJWT from '../../core/middleware/has-jwt';
import hasRole from '../../core/middleware/has-role';
import hasSession from '../../core/middleware/has-session';
import rateLimit from '../../core/middleware/rate-limit';
import asyncHandler from '../../util/async-handler';
import validate from '../../util/validate';
import { AttendanceController } from './controller';
import AttendanceValidation from './validation';

/**
 * Handler to take care of 'Attendance' entity.
 *
 * @returns Express router.
 */
const AttendanceRouter = () => {
  const router = Router({ mergeParams: true });
  const userAttendanceRateLimit = rateLimit(100, 'attendance-me');
  const attendanceRateLimit = rateLimit(15, 'attendance-check');

  // Endpoints are only for authenticated users
  router.use(asyncHandler(hasSession));

  // Check out current day status. Almost never blocked by rate limiter.
  router.get('/status', asyncHandler(AttendanceController.getStatus));

  // Check in for today. Protect with rate limiter.
  router.post(
    '/in',
    attendanceRateLimit,
    asyncHandler(hasJWT),
    bodyParser,
    validate(AttendanceValidation.in),
    asyncHandler(AttendanceController.in)
  );

  // Check out for today. Protect with rate limiter.
  router.patch(
    '/out',
    attendanceRateLimit,
    asyncHandler(hasJWT),
    bodyParser,
    validate(AttendanceValidation.out),
    asyncHandler(AttendanceController.out)
  );

  // Get personal attendance data.
  router.get(
    '/me',
    userAttendanceRateLimit,
    asyncHandler(AttendanceController.getMyAttendances)
  );

  // Gets all attendances data.
  router.get(
    '/',
    asyncHandler(hasRole('admin')),
    validate(AttendanceValidation.getAttendances),
    asyncHandler(AttendanceController.getAttendances)
  );

  return router;
};

export default AttendanceRouter;
