import type { NextFunction, Request, Response } from 'express';

import { services } from '../../services';
import AppError from '../../util/app-error';
import getMasterUserSession from '../../util/get-masteruser-session';
import getProfileSession from '../../util/get-profile-session';
import { verifyPassword } from '../../util/passwords';
import sendResponse from '../../util/send-response';

/**
 * Handle all requests from 'ProfileHandler'.
 */
class ProfileControllerHandler {
  /**
   * Creates a new profile for a single user.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public createProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { masteruserID } = getMasterUserSession(req, res);
    if (!masteruserID) {
      next(new AppError('No session detected. Please log in again!', 401));
      return;
    }

    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!masteruser) {
      next(new AppError('No masteruser found with that ID.', 404));
      return;
    }

    const { username, password, email, name, lastname } = req.body;

    // Validates whether the username or email or phone is already used or not. Use
    // parallel processing for speed.
    const [profileByUsername, profileByEmail] = await Promise.all([
      services.profile.getProfile({ username }),
      services.profile.getProfile({ email }),
    ]);

    // Perform checks and validations.
    if (profileByUsername && profileByEmail) {
      next(
        new AppError(
          {username: 'This username already exists!', email: 'This email already exists!'},
          422
        )
      );
      return;
    }

    if (profileByUsername) {
      next(new AppError({username: 'This username already exists!'}, 422));
      return;
    }

    if (profileByEmail) {
      next(new AppError({email: 'This email already exists!'}, 422));
      return;
    }

    const profile = await services.profile.createProfile(masteruserID, {
      username,
      password,
      email,
      name,
      lastname,
    });

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 201,
      data: profile,
      message: 'Successfully created a single profile for the user!',
      type: 'profiles',
    });
  };

  /**
   * Deletes a single user profile.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public deleteProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params;
    const { password } = req.body;

    const { masteruserID } = getMasterUserSession(req, res);

    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!masteruser) {
      next(new AppError('No masteruser found with that ID.', 404));
      return;
    }

    const profileComplete = await services.profile.getProfileComplete({
      profileID: id,
    });
    if (!profileComplete) {
      next(new AppError('No profile found with that ID.', 404));
      return;
    }

    // Check if the MasterUser has access to the Profile.
    try {
      await services.masteruser.hasAccessToProfile(masteruserID, id);
    } catch (err) {
      next(new AppError('masteruser has no access to Profile', 404));
      return;
    }

    // Check if the password is Profile's password or if it's MasterUser's password.
    if (
      !(await verifyPassword(masteruser.password, password)) &&
      !(await verifyPassword(profileComplete.password, password))
    ) {
      next(new AppError('Incorrect Password', 401));
      return;
    }

    await services.profile.deleteProfile(profileComplete);

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 204,
      data: null,
      message: 'Successfully deleted a single user profile!',
      type: 'profiles',
    });
  };

  /**
   * Gets all the profiles associated to a user
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getMyProfiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { masteruserID } = getMasterUserSession(req, res);
    if (!masteruserID) {
      next(new AppError('No session detected. Please log in again!', 401));
      return;
    }

    const user = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!user) {
      next(new AppError('No user found with that ID.', 404));
      return;
    }

    const profiles = await services.profile.getProfiles({
      masterUserToProfiles: { masteruserPK: user.masteruserPK },
    });

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: profiles,
      message: 'Successfully fetched the profiles of a user!',
      type: 'profiles',
    });
  };

  /**
   * Gets a single user profile by id.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { id } = req.params;

    const { masteruserID } = getMasterUserSession(req, res);

    const profile = await services.profile.getProfile({
      profileID: id,
    });
    
    if (!profile) {
      next(new AppError('No profile found with that ID.', 404));
      return;
    }

    await services.masteruser.hasAccessToProfile(masteruserID, id);

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: profile,
      message: 'Successfully fetched a single user profile!',
      type: 'profiles',
    });
  };

  /**
   * Gets all profiles in the database.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getProfiles = async (req: Request, res: Response) => {
    const profiles = await services.profile.getProfiles();

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: profiles,
      message: 'Successfully fetched data of all profiles!',
      type: 'profiles',
    });
  };

  /**
   * Updates a single user profile. Has validations to ensure that the current user profile
   * does not use others username.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { username, password, name, lastname, email, profileImg } = req.body;
    const { id } = req.params;

    const { profileID } = getProfileSession(req, res);

    if (profileID !== id) {
      next(new AppError('You do not have access to this profile!', 401));
      return;
    }

    // Validate everything via 'Promise.all' for speed.
    const profileCompleteByID = await services.profile.getProfileComplete({
      profileID: id,
    });

    // Perform validations.
    if (!profileCompleteByID) {
      next(new AppError('The profile with this ID does not exist!', 404));
      return;
    }

    // Everything is optional and sanitized according to the previous validation layer.
    const profile = await services.profile.updateProfile(
      { profileID: id },
      { username, password, name, lastname, email, profileImg }
    );

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: profile,
      message: 'Successfully updated a single user profile!',
      type: 'profiles',
    });
  };
}

export const ProfileController = new ProfileControllerHandler();
