import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid/async';

import config from '../../config';
import { CacheService } from '../../core/cache/service';
import Email from '../../core/email';
import { generateDefaultTOTP, validateDefaultTOTP } from '../../core/rfc6238';
import { parseBasicAuth } from '../../core/rfc7617';
import { db } from '../../db';
import { services } from '../../services';
import { MASTERUSER_AUTHORIZATION_HEADER } from '../../types/consts';
import AppError from '../../util/app-error';
import getDeviceID from '../../util/device-id';
import getMasterUserSession from '../../util/get-masteruser-session';
import { extractJWTFromHeader, signJWS, verifyToken } from '../../util/jwt';
import { verifyPassword } from '../../util/passwords';
import randomBytes from '../../util/random-bytes';
import safeCompare from '../../util/safe-compare';
import sendResponse from '../../util/send-response';

/**
 * MasterUser Authentication controller, forwarded from 'handler'.
 */
class AuthControllerHandler {
  /**
   * Gets the masteruser's status.
   * This is a special middleware. It should have no 'next', and this middleware
   * will ignore ANY errors that might be in the way. If an error is found, the masteruser
   * will not be authenticated and will not throw an 'AppError'.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getStatus = async (req: Request, res: Response) => {
    try {
      // Extract token and validate
      const token = extractJWTFromHeader(req, MASTERUSER_AUTHORIZATION_HEADER);
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
      // Check in an unlikely scenario: a masteruser has already deleted his account but their session is still active.
      const [masteruser, session] = await Promise.all([
        services.masteruser.getMasterUser({
          masteruserID: decoded.payload.sub,
        }),
        db.repositories.session.findOneBy({ jwtId: decoded.payload.jti }),
      ]);
      if (!session || !masteruser) {
        this.sendUserStatus(req, res, true, false, null);
        return;
      }

      // Send final response that the masteruser is properly authenticated and authorized.
      this.sendUserStatus(req, res, true, true, masteruser);
    } catch {
      this.sendUserStatus(req, res, false, false, null);
    }
  };

  /**
   * A masteruser can securely reset their password by using this handler.
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
    const { email, username } = req.body;

    // Try to find masteruser by both attributes.
    const [userByUsername, userByEmail] = await Promise.all([
      services.masteruser.getMasterUserComplete({ username }),
      services.masteruser.getMasterUserComplete({ email }),
    ]);

    if (!userByUsername || !userByEmail) {
      next(
        new AppError('MasterUser with those identifiers is not found!', 404)
      );
      return;
    }

    // If username is not paired with the email, then short circuit.
    // We transform them to lower case for easier usability.
    if (
      userByUsername.email.toLowerCase() !== email ||
      userByEmail.username.toLowerCase() !== username.toLowerCase()
    ) {
      next(new AppError('Incorrect username and/or email!', 401));
      return;
    }

    // Ensure that the cache is not filled yet.
    const attempts = await CacheService.getForgotPasswordAttempts(
      userByUsername.masteruserID
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

    // Deny request if the masteruser is not active.
    if (!userByUsername.isActive) {
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

    // Insert token to that masteruser.
    await services.masteruser.updateMasterUser(
      { masteruserID: userByUsername.masteruserID },
      { forgotPasswordCode: token }
    );

    // Send to email.
    await new Email(
      userByUsername.email,
      userByUsername.name + ' ' + userByUsername.lastname
    ).sendForgotPassword(url);

    // Increment cache.
    await CacheService.setForgotPasswordAttempts(userByUsername.masteruserID);

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
   * Logs in a masteruser into the webservice.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public login = async (req: Request, res: Response, next: NextFunction) => {
    const { username, password } = req.body;

    // Find credentials. All are case-insensitive and ready to be used.
    // The arguments to the function are filled with `username`, it is assumed
    // that `username` can be the literal username, email, or even phone number with dashes. As
    // credentials are unique, it will fetch the correct masteruser without fail if the credential exists.
    const masteruser = await services.masteruser.getMasterUserByCredentials(
      username,
      username,
      username
    );

    // At the same time, we also safe-compare passwords to prevent timing attacks.
    if (!masteruser || !(await verifyPassword(masteruser.password, password))) {
      next(new AppError('Invalid username and/or password!', 401));
      return;
    }

    // Ensure the masteruser is not blocked.
    if (!masteruser.isActive) {
      next(
        new AppError('MasterUser is not active. Please contact the admin.', 403)
      );
      return;
    }

    // Clone object and delete sensitive data, prevent leaking confidential information. Do
    // not perform DB calls here - it is unnecessary overhead.
    const filteredUser = { ...masteruser } as Partial<typeof masteruser>;
    delete filteredUser.username;
    delete filteredUser.totpSecret;
    delete filteredUser.password;
    delete filteredUser.masteruserPK;
    delete filteredUser.confirmationCode;
    delete filteredUser.forgotPasswordCode;

    const jwtId = randomUUID();
    const jwt = await signJWS(
      jwtId,
      masteruser.masteruserID,
      525600 /** 1 year */
    );

    // Save session information.
    const masteruserPK = masteruser.masteruserPK;
    const lastActive = Date.now().toString();
    const sessionInfo = getDeviceID(req);
    const signedIn = Date.now().toString();

    await db.repositories.session.save({
      jwtId,
      masteruserPK,
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
      data: { jwt, masteruser: filteredUser },
      message: 'Logged in successfully!',
      type: 'auth',
    });
  };

  /**
   * Logs out a single masteruser from the webservice. Removes all related cookies.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public logout = async (req: Request, res: Response) => {
    try {
      const { jwtId } = getMasterUserSession(req, res);
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
   * Registers a masteruser into the webservice. Exactly the same as 'createUser' in 'MasterUser' entity,
   * with same validations as in 'createUser'.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public register = async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, phoneNumber, password, name, lastname } = req.body;

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

    const confirmationCode = randomUUID();
    const masteruser = await services.masteruser.createMasterUser({
      username,
      email,
      phoneNumber,
      password,
      totpSecret: '',
      confirmationCode,
      forgotPasswordCode: undefined,
      isActive: true,
      name,
      lastname,
    });

    // link to confirm email
    const withPort = config.NODE_ENV === 'production' ? '' : ':3000';
    const link = `${req.protocol}://${req.hostname}${withPort}/verify-email?code=${confirmationCode}&email=${email}`;

    // Send an email consisting of the activation codes.
    await new Email(email, name + ' ' + lastname).sendConfirmation(link);

    try {
      // create Profile associated with masteruser. Here we can add some distinct attribute to the profile.
      await services.profile.createProfile(masteruser.masteruserID, {username, email, name, lastname, password})
    } catch (error) {
      next(new AppError('Error creating associated profile', 500));
      return;
    }

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 201,
      data: masteruser,
      message:
        'Successfully registered! Please check your email address for verification.',
      type: 'auth',
    });
  };

  /**
   * Resets a masteruser password. Should be the flow after 'forgotPassword' is called and the
   * masteruser clicks on that link.
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
    const masteruser = await services.masteruser.getMasterUserComplete({
      forgotPasswordCode: token,
    });
    if (!masteruser) {
      next(
        new AppError('There is no masteruser associated with the token.', 404)
      );
      return;
    }

    // If masteruser is not active, deny request.
    if (!masteruser.isActive) {
      next(
        new AppError(
          'This masteruser is not active. Please contact the administrator for reactivation.',
          403
        )
      );
      return;
    }

    // If passwords are the same, we update them.
    await services.masteruser.updateMasterUser(
      { masteruserID: masteruser.masteruserID },
      { password: newPassword, forgotPasswordCode: undefined }
    );

    // Destroy all sessions related to this masteruser.
    await db.repositories.session.delete({
      masteruserPK: masteruser.masteruserPK,
    });

    // Send email to that masteruser notifying that their password has been reset.
    await new Email(masteruser.email, masteruser.name + ' ' + masteruser.lastname).sendResetPassword();

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
   * SendOTP sends an OTP to a masteruser with this algorithm:
   * - Get masteruser data from session.
   * - If masteruser has asked for OTP beforehand, do not allow until the related KVS is expired.
   * - Choose from query string: phone, email, or authenticator. Default is authenticator.
   * - Generate TOTP using RFC 6238 algorithm with masteruser-specific properties.
   * - If using authenticators, tell masteruser to verify TOTP as soon as possible.
   * - Send TOTP to that media if applicable.
   * - Set 'hasAskedOTP' in cache to true.
   * - Wait for masteruser to provide TOTP in 'verify' part of the endpoint.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public sendOTP = async (req: Request, res: Response, next: NextFunction) => {
    const { masteruserID } = getMasterUserSession(req, res);

    // Check the availability of the masteruser.
    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!masteruser) {
      next(new AppError('MasterUser with this ID does not exist!', 404));
      return;
    }

    // If not yet expired, means that the masteruser has asked in 'successive' order and it is a potential to spam.
    if (await CacheService.getHasAskedOTP(masteruserID)) {
      next(
        new AppError(
          'You have recently asked for an OTP. Please wait 30 seconds before we process your request again.',
          429
        )
      );
      return;
    }

    // Guaranteed to be 'email', 'sms', or 'authenticator' due to the validation layer.
    const totp = generateDefaultTOTP(
      masteruser.username,
      masteruser.totpSecret
    );
    if (req.query.media === 'email') {
      await new Email(masteruser.email, masteruser.name + ' ' + masteruser.lastname).sendOTP(
        totp.token
      );
    }

    // TODO: send SMS
    if (req.query.media === 'sms') {
      next(
        new AppError(
          'Media is not yet implemented. Please use another media.',
          501
        )
      );
      return;
    }

    // If using authenticator, do nothing as its already there, increment redis instead.
    await CacheService.setHasAskedOTP(masteruserID);

    // Send back response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 202,
      data: [],
      message:
        'OTP processed. Please check your chosen media and verify the OTP there.',
      type: 'auth',
    });
  };

  /**
   * Updates the MFA secret of the currently logged in masteruser.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public updateMFA = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { masteruserID } = getMasterUserSession(req, res);

    // Fetch current masteruser.
    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!masteruser) {
      next(new AppError('There is no masteruser with that ID.', 404));
      return;
    }

    // Regenerate new MFA secret.
    const newSecret = await nanoid();
    const totp = generateDefaultTOTP(masteruser.username, newSecret);
    await services.masteruser.updateMasterUser(
      { masteruserID },
      { totpSecret: newSecret }
    );

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: { uri: totp.uri },
      message: 'Successfully updated MFA secrets.',
      type: 'auth',
    });
  };

  /**
   * Updates a password for the currently logged in masteruser.
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
    const { masteruserID } = getMasterUserSession(req, res);

    if (!masteruserID) {
      next(new AppError('No session detected. Please log in again.', 401));
      return;
    }

    // Fetch old data.
    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!masteruser) {
      next(new AppError('There is no masteruser with that ID.', 404));
      return;
    }

    // Compare old passwords.
    const passwordsMatch = await verifyPassword(
      masteruser.password,
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
    await services.masteruser.updateMasterUser(
      { masteruserID },
      { password: newPassword }
    );

    // Send a confirmation email that the masteruser has successfully changed their password.
    await new Email(masteruser.email, masteruser.name + ' ' + masteruser.lastname).sendUpdatePassword();

    // Delete all of the sessions
    await db.repositories.session.delete({
      masteruserPK: masteruser.masteruserPK,
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
   * Verifies a masteruser's email.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public verifyEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { code, email } = req.params;

    // Validate the code. We will obfuscate all error messages for obscurity.
    const masteruser = await services.masteruser.getMasterUserComplete({
      email,
    });
    if (!masteruser) {
      next(new AppError('Invalid email verification code!', 400));
      return;
    }

    if (!masteruser.confirmationCode) {
      next(new AppError('Invalid email verification code!', 400));
      return;
    }

    if (code !== masteruser.confirmationCode) {
      next(new AppError('Invalid email verification code!', 400));
      return;
    }

    // Set 'isActive' to true and set code to not defined.
    const updatedUser = await services.masteruser.updateMasterUser(
      { masteruserID: masteruser.masteruserID },
      { isActive: true, email, confirmationCode: undefined }
    );

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: updatedUser,
      message: 'Email verified! You may now use and log in to the webservice!',
      type: 'auth',
    });
  };

  /**
   * VerifyOTP verifies if a TOTP is valid or not valid. The algorithm:
   * - Parse 'Basic' authentication. Also check if the masteruser is blocked or not (failed to input correct TOTP many times in successive order).
   * - If the masteruser is blocked, send email / notification to the masteruser.
   * - Get masteruser data from 'username' column of the authentication string.
   * - Pull the masteruser's secret key from the database.
   * - Validate the masteruser's TOTP. The input OTP will be fetched from the 'password' column of the authentication string.
   * - If the TOTP is valid, give back JWS token. This is the masteruser's second session. If not valid, increment the 'TOTPAttempts' in cache.
   * - Take note of the JTI, store it inside Redis cache for statefulness.
   * - Send back response.
   *
   * Token gained from this function will act as a signed cookie that can be used to authenticate oneself.
   * Username is the masteruser's ID. The password is the masteruser's TOTP token.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public verifyOTP = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Validate header.
    if (!req.headers.authorization) {
      this.invalidBasicAuth(
        'Missing authorization in request!',
        401,
        res,
        next
      );
      return;
    }

    // Check whether authentication scheme is correct.
    const { username, password } = parseBasicAuth(req.headers.authorization);
    if (!username || !password) {
      this.invalidBasicAuth('Invalid authentication scheme!', 401, res, next);
      return;
    }

    // Check whether username exists.
    const masteruser = await services.masteruser.getMasterUserComplete({
      masteruserID: username,
    });
    if (!masteruser) {
      this.invalidBasicAuth(
        'MasterUser with that ID is not found.',
        404,
        res,
        next
      );
      return;
    }

    // If masteruser has reached 3 times, then block the masteruser's attempt.
    // TODO: should send email/sms/push notification to the relevant masteruser
    const attempts = await CacheService.getOTPAttempts(masteruser.masteruserID);
    if (attempts && Number.parseInt(attempts, 10) === 3) {
      // If masteruser is not 'email-locked', send security alert to prevent spam.
      if (
        !(await CacheService.getSecurityAlertEmailLock(masteruser.masteruserID))
      ) {
        await CacheService.setSecurityAlertEmailLock(masteruser.masteruserID);
        await new Email(
          masteruser.email,
          masteruser.name + ' ' + masteruser.lastname
        ).sendNotification();
      }

      this.invalidBasicAuth(
        'You have exceeded the number of times allowed for a secured session. Please try again in the next day.',
        429,
        res,
        next
      );
      return;
    }

    // Ensures that OTP has never been used before.
    const usedOTP = await CacheService.getBlacklistedOTP(
      masteruser.masteruserID,
      password
    );
    if (usedOTP) {
      await CacheService.setOTPAttempts(masteruser.masteruserID);
      this.invalidBasicAuth(
        'This OTP has expired. Please request it again in 30 seconds!',
        410,
        res,
        next
      );
      return;
    }

    // Validate OTP.
    const validTOTP = validateDefaultTOTP(password, masteruser.totpSecret);
    if (!validTOTP) {
      await CacheService.setOTPAttempts(masteruser.masteruserID);
      this.invalidBasicAuth(
        'Invalid authentication, wrong OTP code.',
        401,
        res,
        next
      );
      return;
    }

    // Make sure to blacklist the TOTP (according to the specs).
    await CacheService.blacklistOTP(masteruser.masteruserID, password);

    // Generate JWS as the authorization ticket.
    const jti = await nanoid();
    const token = await signJWS(
      jti,
      masteruser.masteruserID,
      900 /** 15 min */
    );

    // Set OTP session by its JTI.
    await CacheService.setOTPSession(jti, masteruser.masteruserID);

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: { token },
      message:
        'OTP verified. Special session has been given to the masteruser.',
      type: 'auth',
    });
  };

  /**
   * Utility function to set `Authenticate` header with the proper `Realm`. Why
   * we do not use `WWW-Authenticate` like in RFC 7617? It is to prevent the
   * front-end from summoning the not-really-friendly authentication popup.
   *
   * @param msg - Error message to be passed to the masteruser.
   * @param code - HTTP status code for the masteruser.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  private invalidBasicAuth = (
    msg: string,
    code: number,
    res: Response,
    next: NextFunction
  ) => {
    res.set('Authenticate', 'Basic realm="OTP-MFA", charset="UTF-8"');
    next(new AppError(msg, code));
  };

  /**
   * Sends the masteruser's authentication status to the client in the form of JSON response.
   * The 'type' of the response is authentication, as this one does not really
   * fit with the 'users' type. This intentionally returns both the authentication status
   * AND the masteruser, so the front-end does not need to create two sequential requests just to get
   * the current masteruser (this will be used in many requests in the front-end, so let's just keep our
   * bandwith small).
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param isAuthenticated - Boolean value whether the masteruser is authenticated or not.
   * @param isMFA - Boolean value whether the masteruser is on secure session or not.
   * @param masteruser - The masteruser's data, or a null value.
   */
  private sendUserStatus = (
    req: Request,
    res: Response,
    isAuthenticated: boolean,
    isMFA: boolean,
    masteruser: Record<string, unknown> | null
  ) => {
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: { isAuthenticated, isMFA, masteruser },
      message: "Successfully fetched the masteruser's status!",
      type: 'auth',
    });
  };
}

export const AuthController = new AuthControllerHandler();
