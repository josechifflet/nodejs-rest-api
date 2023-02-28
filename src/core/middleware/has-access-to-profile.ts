import type { NextFunction, Request, Response } from 'express';

import { services } from '../../services';
import getMasterUserSession from '../../util/get-masteruser-session';
import getProfileSession from '../../util/get-profile-session';

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

  await services.masteruser.hasAccessToProfile(masteruserID, profileID);

  next();
};

export default hasAccessToProfile;
