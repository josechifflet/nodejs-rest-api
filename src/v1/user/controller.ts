import type { NextFunction, Request, Response } from 'express';

import { db } from '../../db';
import { services } from '../../services';
import AppError from '../../util/app-error';
import sendResponse from '../../util/send-response';

/**
 * Create controller to handle all requests forwarded from 'UserHandler'.
 */
class UserControllerHandler {
  /**
   * Creates a single user. Has several validations to ensure that the username,
   * email, and phone number are all unique and have not yet been used by another user.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public createUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { username, email, phoneNumber, password, name, lastname, role } =
      req.body;

    // Validates whether the username or email or phone is already used or not. Use
    // parallel processing for speed.
    const [userByUsername, userByEmail, userByPhone] = await Promise.all([
      services.user.getUser({ username }),
      services.user.getUser({ email }),
      services.user.getUser({ phoneNumber }),
    ]);

    // Perform checks and validations.
    if (userByUsername) {
      next(new AppError('This username has existed already!', 422));
      return;
    }

    if (userByEmail) {
      next(new AppError('This email has been used by another user!', 422));
      return;
    }

    if (userByPhone) {
      next(
        new AppError('This phone number has been used by another user!', 422)
      );
      return;
    }

    const user = await services.user.createUser({
      username,
      email,
      phoneNumber,
      password,
      totpSecret: '', // Filled by the function
      role, // optional, defaults to 'user'
      name,
      lastname,
    });

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 201,
      data: user,
      message: 'Successfully created a single user!',
      type: 'users',
    });
  };

  /**
   * Deactivates / ban a single user.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public deactivateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const user = await services.user.getUserComplete({
      ID: id,
    });
    if (!user) {
      next(new AppError('The user with this ID does not exist!', 404));
      return;
    }

    await services.user.updateUser({ ID: id }, { isActive: false });

    await db.repositories.session.delete({
      id: user.ID,
    });

    res.status(204).send();
    return;
  };

  /**
   * Deletes a single user.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const user = await services.user.getUserComplete({
      ID: id,
    });
    if (!user) {
      next(new AppError('The user with this ID does not exist!', 404));
      return;
    }

    await services.user.deleteUser({ ID: id });

    // This shouldn't happen, but let's say if an admin deletes themself...
    await db.repositories.session.delete({
      id: user.ID,
    });
    res.status(204).send();
    return;
  };

  /**
   * Gets a single user.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getUser = async (req: Request, res: Response) => {
    const { ID } = req.session;

    const user = await services.user.getUser({
      ID,
    });

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: user,
      message: 'Successfully fetched a single user!',
      type: 'users',
    });
  };

  /**
   * Gets all users in the database.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getUsers = async (req: Request, res: Response) => {
    const users = await services.user.getUsers();

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: users,
      message: 'Successfully fetched data of all users!',
      type: 'users',
    });
  };

  /**
   * Updates a single user. Has validations to ensure that the current user
   * does not use others phone number or email.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const {
      username,
      email,
      phoneNumber,
      password,
      role,
      isActive,
      name,
      lastname,
    } = req.body;
    const { ID } = req.session;

    // Validate everything via 'Promise.all' for speed.
    const userByID = services.user.getUser({
      ID: ID,
    });

    // Perform validations.
    if (!userByID) {
      next(new AppError('The user with this ID does not exist!', 404));
      return;
    }

    // Everything is optional and sanitized according to the previous validation layer.
    const user = await services.user.updateUser(
      { ID: ID },
      {
        username,
        email,
        phoneNumber,
        password,
        role,
        isActive,
        name,
        lastname,
      }
    );

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: user,
      message: 'Successfully updated a single user!',
      type: 'users',
    });
  };
}

export const UserController = new UserControllerHandler();
