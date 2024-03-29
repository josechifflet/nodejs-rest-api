import type { NextFunction, Request, Response } from 'express';

import UserService from '../../services/user';
import AppError from '../../util/app-error';

/**
 * Checks whether a user does have sufficient privileges / roles to access this endpoint.
 *
 * @param roles - Roles that are allowed to access this endpoint.
 */
const hasRole =
  (...roles: string[]) =>
  async (req: Request, _: Response, next: NextFunction) => {
    if (!req.session.ID) {
      next(new AppError('Session not found. Please log in again!', 401));
      return;
    }

    const user = await UserService.getUser({ ID: req.session.ID });
    if (!user) {
      next(new AppError('User with that ID is not found.', 404));
      return;
    }

    if (!roles.includes(user.role)) {
      next(
        new AppError('You are not authorized to access this endpoint!', 403)
      );
      return;
    }

    next();
  };

export default hasRole;
