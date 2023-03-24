import type { Request, Response } from 'express';

import { UserSessionDataSchema } from '../types/userSession';
import AppError from './app-error';

/**
 * Retrieve's User session data object.
 *
 * @param _ - Express.js's request object.
 * @param res - Express.js's response object.
 */
const getUserSession = (_: Request, res: Response) => {
  const { userSession } = res.locals;
  if (!userSession) {
    throw new AppError('You are not logged in yet! Please log in first!', 401);
  }

  const validateUserSession = UserSessionDataSchema.safeParse(userSession);
  if (!validateUserSession.success) {
    throw new AppError('You are not logged in yet! Please log in first!', 401);
  }

  return validateUserSession.data;
};

export default getUserSession;
