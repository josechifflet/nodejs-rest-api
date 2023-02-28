import { Router } from 'express';

import bodyParser from '../../core/middleware/body-parser';
import hasMasterUserSession from '../../core/middleware/has-masteruser-session';
import hasProfileSession from '../../core/middleware/has-profile-session';
import rateLimit from '../../core/middleware/rate-limit';
import asyncHandler from '../../util/async-handler';
import hasAccessToProfile from '../../util/has-access-to-profile';
import validate from '../../util/validate';
import { ProfileController } from './controller';
import ProfileValidation from './validation';

/**
 * Handle all profile-related endpoints.
 *
 * @returns Express router.
 */
const ProfileRouter = () => {
  const router = Router();
  const profileRateLimit = rateLimit(100, 'profiles-me', 15);

  // Below endpoints are allowed for only masterusers.
  router.use(asyncHandler(hasMasterUserSession));

  router
    .use(profileRateLimit)
    .route('/me')
    .get(asyncHandler(ProfileController.getMyProfiles))
    .post(
      bodyParser,
      validate(ProfileValidation.createProfile),
      asyncHandler(ProfileController.createProfile)
    );

  router
    .use(profileRateLimit)
    .route('/me/:id')
    .get(
      validate(ProfileValidation.getProfile),
      asyncHandler(ProfileController.getProfile)
    )
    .patch(
      bodyParser,
      validate(ProfileValidation.updateMyProfile),
      asyncHandler(hasProfileSession),
      asyncHandler(hasAccessToProfile),
      asyncHandler(ProfileController.updateProfile)
    )
    .delete(
      bodyParser,
      validate(ProfileValidation.deleteProfile),
      asyncHandler(ProfileController.deleteProfile)
    );

  return router;
};

export default ProfileRouter;
