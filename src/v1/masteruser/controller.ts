import type { NextFunction, Request, Response } from 'express';

import { db } from '../../db';
import { services } from '../../services';
import AppError from '../../util/app-error';
import getMasterUserSession from '../../util/get-masteruser-session';
import sendResponse from '../../util/send-response';

/**
 * Create controller to handle all requests forwarded from 'UserHandler'.
 */
class UserControllerHandler {
  /**
   * Creates a single masteruser. Has several validations to ensure that the username,
   * email, and phone number are all unique and have not yet been used by another masteruser.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public createMasterUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { username, email, phoneNumber, password, name, lastname, role } = req.body;

    // Validates whether the username or email or phone is already used or not. Use
    // parallel processing for speed.
    const [userByUsername, userByEmail, userByPhone] = await Promise.all([
      services.masteruser.getMasterUser({ username }),
      services.masteruser.getMasterUser({ email }),
      services.masteruser.getMasterUser({ phoneNumber }),
    ]);

    // Perform checks and validations.
    if (userByUsername) {
      next(new AppError('This username has existed already!', 422));
      return;
    }

    if (userByEmail) {
      next(
        new AppError('This email has been used by another masteruser!', 422)
      );
      return;
    }

    if (userByPhone) {
      next(
        new AppError(
          'This phone number has been used by another masteruser!',
          422
        )
      );
      return;
    }

    const masteruser = await services.masteruser.createMasterUser({
      username,
      email,
      phoneNumber,
      password,
      totpSecret: '', // Filled by the function
      role, // optional, defaults to 'masteruser'
      name,
      lastname,
    });

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 201,
      data: masteruser,
      message: 'Successfully created a single masteruser!',
      type: 'users',
    });
  };

  /**
   * Deactivates / ban a single masteruser.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public deactivateMasterUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID: id,
    });
    if (!masteruser) {
      next(new AppError('The masteruser with this ID does not exist!', 404));
      return;
    }

    await services.masteruser.updateMasterUser(
      { masteruserID: id },
      { isActive: false }
    );

    await db.repositories.session.delete({
      masteruserPK: masteruser.masteruserPK,
    });

    res.status(204).send();
    return;
  };

  /**
   * Deletes a single masteruser.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public deleteMasterUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID: id,
    });
    if (!masteruser) {
      next(new AppError('The masteruser with this ID does not exist!', 404));
      return;
    }

    await services.masteruser.deleteMasterUser({ masteruserID: id });

    // This shouldn't happen, but let's say if an admin deletes themself...
    await db.repositories.session.delete({
      masteruserPK: masteruser.masteruserPK,
    });
    res.status(204).send();
    return;
  };

  /**
   * Gets a single masteruser.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getMasterUser = async (req: Request, res: Response) => {
    const { masteruserID } = getMasterUserSession(req, res);

    const masteruser = await services.masteruser.getMasterUser({
      masteruserID,
    });

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: masteruser,
      message: 'Successfully fetched a single masteruser!',
      type: 'users',
    });
  };

  /**
   * Gets all users in the database.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getMasterUsers = async (req: Request, res: Response) => {
    const users = await services.masteruser.getMasterUsers();

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
   * Updates a single masteruser. Has validations to ensure that the current masteruser
   * does not use others phone number or email.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public updateMasterUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { username, email, phoneNumber, password, role, isActive, name, lastname } =
      req.body;
    const { masteruserID } = getMasterUserSession(req, res);

    // Validate everything via 'Promise.all' for speed.
    const userByID = services.masteruser.getMasterUser({ masteruserID: masteruserID })

    // Perform validations.
    if (!userByID) {
      next(new AppError('The masteruser with this ID does not exist!', 404));
      return;
    }

    // Everything is optional and sanitized according to the previous validation layer.
    const masteruser = await services.masteruser.updateMasterUser(
      { masteruserID: masteruserID },
      {
        username,
        email,
        phoneNumber,
        password,
        role,
        isActive,
        name,
        lastname
      }
    );

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: masteruser,
      message: 'Successfully updated a single masteruser!',
      type: 'users',
    });
  };
}

export const MasterUserController = new UserControllerHandler();
