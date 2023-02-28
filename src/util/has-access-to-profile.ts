import type { NextFunction, Request, Response } from 'express';

import { services } from '../services';
import AppError from './app-error';
import getMasterUserSession from './get-masteruser-session';
import getProfileSession from './get-profile-session';

/**
 * Validates whether a `MasterUser` is associated with a `Profile`
 * This middleware must be called after `hasMasterUserSession` and `hasProfileSession`.
 * In that specific order.
 *
 * @param req - Express.js's request object.
 * @param _ - Express.js's response object.
 * @param next - Express.js's next function.
 */
const hasAccessToProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { masteruserID } = getMasterUserSession(req, res);
  const { profileID } = getProfileSession(req, res);
  try {
    await services.masteruser.hasAccessToProfile(masteruserID, profileID);
  } catch (err) {
    next(new AppError('Masteruser has no access to Profile', 404));
    return;
  }

  next();
};

export default hasAccessToProfile;
