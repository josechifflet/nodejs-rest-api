import { NextFunction, Request, Response } from 'express';

import { db } from '../../db';
import { services } from '../../services';
import { PROFILE_AUTHORIZATION_HEADER } from '../../types/consts';
import AppError from '../../util/app-error';
import getDeviceID from '../../util/device-id';
import getMasterUserSession from '../../util/get-masteruser-session';
import {
  extractJWTFromHeader,
  validateJWTPayload,
  verifyToken,
} from '../../util/jwt';

/**
 * Validates whether a user is authenticated or not (via jwt located in x-profile-authorization).
 * This middlware must be called after `hasMasterUserSession` middleware.
 *
 * @param req - Express.js's request object.
 * @param _ - Express.js's response object.
 * @param next - Express.js's next function.
 */
const hasProfileSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { masteruserID } = getMasterUserSession(req, res);

  const token = extractJWTFromHeader(req, PROFILE_AUTHORIZATION_HEADER);

  // Validates whether the session exists or not.
  if (!token) {
    next(new AppError('You are not logged in yet! Please log in first!', 401));
    return;
  }

  // Verify the token.
  const decoded = await verifyToken(token);
  const validatedPayload = validateJWTPayload(decoded.payload);

  // Verify the token's JTI.
  if (!decoded.payload.jti) {
    next(
      new AppError(
        'The JTI of the token is invalid or not recognized. Please verify your session again.',
        401
      )
    );
    return;
  }

  // Check the token id exists in the session's table
  // Check in an unlikely scenario: a profile has already deleted his account but their session is still active.
  const [profile, session] = await Promise.all([
    services.profile.getProfile({ profileID: decoded.payload.sub }),
    db.repositories.session.findOneBy({ jwtId: decoded.payload.jti }),
  ]);
  if (!session) {
    next(
      new AppError(
        'The JTI of the token is invalid or not recognized. Please verify your session again.',
        401
      )
    );
    return;
  }
  if (!profile) {
    next(new AppError('User belonging to this session does not exist.', 400));
    return;
  }

  // Verifies if the profile is not banned (isActive is true).
  if (!profile.isActive) {
    next(new AppError('User is not active. Please contact the admin.', 403));
    return;
  }

  // Refresh session data to contain the new session information.
  const lastActive = Date.now().toString();
  const sessionInfo = getDeviceID(req);
  const { profileID } = profile;

  await db.repositories.session.update(
    { jwtId: decoded.payload.jti },
    {
      lastActive,
      sessionInfoDevice: sessionInfo.device,
      sessionInfoIp: sessionInfo.ip,
    }
  );

  res.locals.profileSession = {
    masteruserID,
    profileID,
    profile,
    lastActive,
    sessionInfo,
    signedIn: session.signedIn,
    jwtId: decoded.payload.jti,
    jwtPayload: validatedPayload,
  };

  // Go to the next middleware.
  next();
};

export default hasProfileSession;
