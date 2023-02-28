import type { Request, Response } from 'express';

import { MasterUserSessionDataSchema } from '../types/masterUserSession';
import AppError from './app-error';

/**
 * Retrieve's MasterUser session data object.
 *
 * @param _ - Express.js's request object.
 * @param res - Express.js's response object.
 */
const getMasterUserSession = (_: Request, res: Response) => {
  const { masterUserSession } = res.locals;
  if (!masterUserSession) {
    throw new AppError('You are not logged in yet! Please log in first!', 401);
  }

  const validateMasterUserSession =
    MasterUserSessionDataSchema.safeParse(masterUserSession);
  if (!validateMasterUserSession.success) {
    throw new AppError('You are not logged in yet! Please log in first!', 401);
  }

  return validateMasterUserSession.data;
};

export default getMasterUserSession;
