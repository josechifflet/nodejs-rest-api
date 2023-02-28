import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

import config from '../../config';
import { CacheService } from '../../core/cache/service';
import Email from '../../core/email';
import { db } from '../../db';
import { services } from '../../services';
import { PROFILE_AUTHORIZATION_HEADER } from '../../types/consts';
import AppError from '../../util/app-error';
import getDeviceID from '../../util/device-id';
import getMasterUserSession from '../../util/get-masteruser-session';
import getProfileSession from '../../util/get-profile-session';
import { extractJWTFromHeader, signJWS, verifyToken } from '../../util/jwt';
import { verifyPassword } from '../../util/passwords';
import randomBytes from '../../util/random-bytes';
import safeCompare from '../../util/safe-compare';
import sendResponse from '../../util/send-response';

/**
 * Profile Authentication controller, forwarded from 'handler'.
 */
class ProfileAuthControllerHandler {
  /**
   * Gets the user's status.
   * This is a special middleware. It should have no 'next', and this middleware
   * will ignore ANY errors that might be in the way. If an error is found, the profile
   * will not be authenticated and will not throw an 'AppError'.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getStatus = async (req: Request, res: Response) => {
    try {
      // Extract token and validate
      const token = extractJWTFromHeader(req, PROFILE_AUTHORIZATION_HEADER);
      if (!token) {
        this.sendUserStatus(req, res, true, false, null);
        return;
      }

      // Verify token.
      let decoded;
      try {
        decoded = await verifyToken(token);
      } catch {
        this.sendUserStatus(req, res, true, false, null);
        return;
      }

      // Verify JTI.
      if (!decoded.payload.jti) {
        this.sendUserStatus(req, res, true, false, null);
        return;
      }

      // Check the token id exists in the session's table
      // Check in an unlikely scenario: a profile has already deleted his account but their session is still active.
      const [profile, session] = await Promise.all([
        services.profile.getProfile({ profileID: decoded.payload.sub }),
        db.repositories.session.findOneBy({ jwtId: decoded.payload.jti }),
      ]);
      if (!session || !profile) {
        this.sendUserStatus(req, res, true, false, null);
        return;
      }

      // Send final response that the profile is properly authenticated and authorized.
      this.sendUserStatus(req, res, true, true, profile);
    } catch {
      this.sendUserStatus(req, res, false, false, null);
    }
  };

  /**
   * A profile can securely reset their password by using this handler.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { email } = req.body;

    const profileByEmail = await services.profile.getProfileComplete({ email });

    if (!profileByEmail) {
      next(new AppError('Profile with that email not found!', 404));
      return;
    }

    // Ensure that the cache is not filled yet.
    const attempts = await CacheService.getForgotPasswordAttempts(
      profileByEmail.profileID
    );
    if (attempts && Number.parseInt(attempts, 10) === 2) {
      next(
        new AppError(
          'You have recently asked for a password reset twice. Please wait for two hours before retrying.',
          429
        )
      );
      return;
    }

    // Deny request if the profile is not active.
    if (!profileByEmail.isActive) {
      next(
        new AppError(
          'This account is disabled. Please contact the admin for reactivation.',
          403
        )
      );
      return;
    }

    // Generate a random reset token and a password reset URL. In development, set the URL
    // to port 3000 as well.
    const token = await randomBytes();
    const withPort = config.NODE_ENV === 'production' ? '' : ':3000';
    const url = `${req.protocol}://${req.hostname}${withPort}/reset-password?token=${token}&action=reset`;

    // Insert token to that profile.
    await services.profile.updateProfile(
      { profileID: profileByEmail.profileID },
      { forgotPasswordCode: token }
    );

    // Send to email.
    await new Email(
      profileByEmail.email,
      profileByEmail.username
    ).sendForgotPassword(url);

    // Increment cache.
    await CacheService.setForgotPasswordAttempts(profileByEmail.profileID);

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 202,
      data: [],
      message: 'Reset password request has been sent to the email!',
      type: 'auth',
    });
  };

  /**
   * Logs in a profile into the webservice.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public login = async (req: Request, res: Response, next: NextFunction) => {
    const { masteruserID } = getMasterUserSession(req, res);

    const { username, password } = req.body;

    // Find credentials. All are case-insensitive and ready to be used.
    const profile = await services.profile.getProfileComplete({ username });

    if (!profile || !(await verifyPassword(profile.password, password))) {
      next(new AppError("Invalid Credentials", 401));
      return;
    }

    // Get Master User by masteruserID
    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });

    // Check if Master User exists
    if (!masteruser) {
      next(new AppError('Master User not found', 404));
      return;
    }

    // Check if profile is already added to Master User
    await services.masteruser.addProfileToMasterUser(masteruser, profile);

    // Ensure the profile is not blocked.
    if (!profile.isActive) {
      next(
        new AppError('Profile is not active. Please contact the admin.', 403)
      );
      return;
    }

    // Clone object and delete sensitive data, prevent leaking confidential information. Do
    // not perform DB calls here - it is unnecessary overhead.
    const filteredProfile = { ...profile } as Partial<typeof profile>;
    delete filteredProfile.password;

    const jwtId = randomUUID();
    const jwt = await signJWS(jwtId, profile.profileID, 480 /** 8 hour */);

    // Save session information.
    const profileID = profile.profileID;
    const lastActive = Date.now().toString();
    const sessionInfo = getDeviceID(req);
    const signedIn = Date.now().toString();

    await db.repositories.session.save({
      jwtId,
      masteruserID,
      profileID,
      lastActive,
      sessionInfoDevice: sessionInfo.device,
      sessionInfoIp: sessionInfo.ip,
      signedIn,
    });

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: { jwt, profile: filteredProfile },
      message: 'Logged in successfully!',
      type: 'auth',
    });
  };

  /**
   * Logs out a single profile from the webservice. Removes all related cookies.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public logout = async (req: Request, res: Response) => {
    try {
      const { jwtId } = getProfileSession(req, res);
      await db.repositories.session.delete({ jwtId });
    } catch (error) {
      //
    }

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: [],
      message: 'Logged out successfully!',
      type: 'auth',
    });
  };

  /**
   * Resets a profile password. Should be the flow after 'forgotPassword' is called and the
   * profile clicks on that link.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { newPassword, confirmPassword } = req.body;
    const { token } = req.params;

    // Validates whether the passwords are the same or not.
    if (!safeCompare(newPassword, confirmPassword)) {
      next(new AppError('Your passwords do not match!', 400));
      return;
    }

    // Validates whether the token is the same or not.
    const profile = await services.profile.getProfileComplete({
      forgotPasswordCode: token,
    });
    if (!profile) {
      next(new AppError('There is no profile associated with the token.', 404));
      return;
    }

    // If profile is not active, deny request.
    if (!profile.isActive) {
      next(
        new AppError(
          'This profile is not active. Please contact the administrator for reactivation.',
          403
        )
      );
      return;
    }

    // If passwords are the same, we update them.
    await services.profile.updateProfile(
      { profileID: profile.profileID },
      { password: newPassword, forgotPasswordCode: undefined }
    );

    // Destroy all sessions related to this profile.
    await db.repositories.session.delete({ profilePK: profile.profilePK });

    // Send email to that profile notifying that their password has been reset.
    await new Email(profile.email, profile.username).sendResetPassword();

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: [],
      message:
        'Password has been successfully reset. Please try logging in again!',
      type: 'auth',
    });
  };

  /**
   * Updates a password for the currently logged in profile.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public updatePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const { profileID } = getProfileSession(req, res);

    if (!profileID) {
      next(new AppError('No session detected. Please log in again.', 401));
      return;
    }

    // Fetch old data.
    const profile = await services.profile.getProfileComplete({ profileID });
    if (!profile) {
      next(new AppError('There is no profile with that ID.', 404));
      return;
    }

    // Compare old passwords.
    const passwordsMatch = await verifyPassword(
      profile.password,
      currentPassword
    );
    if (!passwordsMatch) {
      next(new AppError('Your previous password is wrong!', 401));
      return;
    }

    // Confirm passwords. We time-safe compare to prevent timing attacks.
    if (!safeCompare(newPassword, confirmPassword)) {
      next(new AppError('Your new passwords do not match.', 401));
      return;
    }

    // Update new password.
    await services.profile.updateProfile(
      { profileID },
      { password: newPassword }
    );

    // Send a confirmation email that the profile has successfully changed their password.
    await new Email(profile.email, profile.username).sendUpdatePassword();

    // Delete all of the sessions
    await db.repositories.session.delete({
      profilePK: profile.profilePK,
    });

    // Send back response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: [],
      message: 'Password updated. For security, please log in again!',
      type: 'auth',
    });
  };

  /**
   * Sends the profile's authentication status to the client in the form of JSON response.
   * The 'type' of the response is authentication, as this one does not really
   * fit with the 'users' type. This intentionally returns both the authentication status
   * AND the profile, so the front-end does not need to create two sequential requests just to get
   * the current profile (this will be used in many requests in the front-end, so let's just keep our
   * bandwith small).
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param isAuthenticated - Boolean value whether the profile is authenticated or not.
   * @param isMFA - Boolean value whether the profile is on secure session or not.
   * @param profile - The profile's data, or a null value.
   */
  private sendUserStatus = (
    req: Request,
    res: Response,
    isAuthenticated: boolean,
    isMFA: boolean,
    profile: Record<string, unknown> | null
  ) => {
    const { masteruserID } = getMasterUserSession(req, res);
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: { isAuthenticated, isMFA, profile, masteruserID },
      message: "Successfully fetched the profile's status!",
      type: 'auth',
    });
  };
}

export const ProfileAuthController = new ProfileAuthControllerHandler();
