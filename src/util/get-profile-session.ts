import type { Request, Response } from 'express';

import { ProfileSessionDataSchema } from '../types/profileSession';
import AppError from './app-error';

/**
 * Retrieve's Profile session data object.
 *
 * @param _ - Express.js's request object.
 * @param res - Express.js's response object.
 */
const getProfileSession = (_: Request, res: Response) => {
  const { profileSession } = res.locals;
  if (!profileSession) {
    throw new AppError('You are not logged in yet! Please log in first!', 401);
  }

  const validateProfileSession =
    ProfileSessionDataSchema.safeParse(profileSession);
  if (!validateProfileSession.success) {
    throw new AppError('You are not logged in yet! Please log in first!', 401);
  }

  return validateProfileSession.data;
};

export default getProfileSession;
