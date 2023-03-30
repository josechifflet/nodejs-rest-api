import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid/async';

import config from '../../config';
import { CacheService } from '../../core/cache/service';
import Email from '../../core/email';
import { generateDefaultTOTP, validateDefaultTOTP } from '../../core/rfc6238';
import { parseBasicAuth } from '../../core/rfc7617';
import { User } from '../../db/models/user.model';
import { services } from '../../services';
import AppError from '../../util/app-error';
import setCookie from '../../util/cookies';
import getDeviceID from '../../util/device-id';
import { extractJWT, signJWS, verifyToken } from '../../util/jwt';
import { verifyPassword } from '../../util/passwords';
import randomBytes from '../../util/random-bytes';
import safeCompare from '../../util/safe-compare';
import sendResponse from '../../util/send-response';

/**
 * Authentication controller, forwarded from 'handler'.
 */
class AuthControllerHandler {
  /**
   * Gets the user's status (is normally authenticated and is MFA authenticated). The authentication
   * process is similar to the ones in 'has-session.ts' and 'has-jwt.ts'.
   * This is a special middleware. It should have no 'next', and this middleware
   * will ignore ANY errors that might be in the way. If an error is found, the user
   * will not be authenticated and will not throw an 'AppError'.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public getStatus = async (req: Request, res: Response) => {
    try {
      // Check session.
      if (!req.session.ID) {
        this.sendUserStatus(req, res, false, false, null);
        return;
      }

      // Make sure that the user exists in the database.
      const user = await services.user.getUserComplete({
        userID: req.session.ID,
      });

      if (!user) {
        this.sendUserStatus(req, res, false, false, null);
        return;
      }

      // Make sure that the user is not blocked.
      if (!user.isActive) {
        this.sendUserStatus(req, res, false, false, null);
        return;
      }

      // Extract token and validate. From this point on, the user is defined (authenticated)
      // and will be sent back as part of the response (not null as in the previous ones).
      const token = extractJWT(req);
      if (!token) {
        this.sendUserStatus(req, res, true, false, user);
        return;
      }

      // Verify token.
      let decoded;
      try {
        decoded = await verifyToken(token);
      } catch {
        this.sendUserStatus(req, res, true, false, user);
        return;
      }

      // Verify JTI.
      if (!decoded.payload.jti) {
        this.sendUserStatus(req, res, true, false, user);
        return;
      }

      // Checks whether JTI exists or not in the cache.
      const ID = await CacheService.getOTPSession(decoded.payload.jti);
      if (!ID) {
        this.sendUserStatus(req, res, true, false, user);
        return;
      }

      // Check if JTI is equal to the current session, and ensure that the subject
      // is equal to the user ID as well.
      if (req.session.ID !== ID || decoded.payload.sub !== ID) {
        this.sendUserStatus(req, res, true, false, user);
      }

      // Send final response that the user is properly authenticated and authorized.
      this.sendUserStatus(req, res, true, true, user);
    } catch {
      this.sendUserStatus(req, res, false, false, null);
    }
  };

  /**
   * A user can securely reset their password by using this handler.
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

    // Try to find user by both attributes.
    const [userByUsername, userByEmail] = await Promise.all([
      services.user.getUserComplete({ username }),
      services.user.getUserComplete({ email }),
    ]);

    if (!userByUsername || !userByEmail) {
      next(new AppError('User with those identifiers is not found!', 404));
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
      userByUsername.userID
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

    // Deny request if the user is not active.
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

    // Insert token to that user.
    await services.user.updateUser(
      { userID: userByUsername.userID },
      { forgotPasswordCode: token }
    );

    // Send to email.
    await new Email(
      userByUsername.email,
      userByUsername.name + ' ' + userByUsername.lastname
    ).sendForgotPassword(url);

    // Increment cache.
    await CacheService.setForgotPasswordAttempts(userByUsername.userID);

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
   * Logs in a user into the webservice.
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
    // credentials are unique, it will fetch the correct user without fail if the credential exists.
    const user = await services.user.getUserByCredentials(
      username,
      username,
      username
    );

    // At the same time, we also safe-compare passwords to prevent timing attacks.
    if (!user || !(await verifyPassword(user.password, password))) {
      next(new AppError('Invalid username and/or password!', 401));
      return;
    }

    // Ensure the user is not blocked.
    if (!user.isActive) {
      next(new AppError('User is not active. Please contact the admin.', 403));
      return;
    }

    // Clone object and delete sensitive data, prevent leaking confidential information. Do
    // not perform DB calls here - it is unnecessary overhead.
    const filteredUser = { ...user } as Partial<typeof user>;
    delete filteredUser.username;
    delete filteredUser.totpSecret;
    delete filteredUser.password;
    delete filteredUser.userPK;
    delete filteredUser.confirmationCode;
    delete filteredUser.forgotPasswordCode;

    // Re-generate session to prevent multiple users sharing one session ID.
    req.session.regenerate((err) => {
      if (err) {
        next(new AppError('Failed to initialize a secure session.', 500));
      }

      // Set signed cookies with session information.
      req.session.ID = user.userID;
      req.session.lastActive = Date.now().toString();
      req.session.sessionInfo = getDeviceID(req);
      req.session.signedIn = Date.now().toString();

      // Remove MFA session cookie if it exists.
      setCookie({
        req,
        res,
        name: config.JWT_COOKIE_NAME,
        value: 'loggedOut',
        maxAge: 10,
      });

      // Send response.
      sendResponse({
        req,
        res,
        status: 'success',
        statusCode: 200,
        data: filteredUser,
        message: 'Logged in successfully!',
        type: 'auth',
      });
    });
  };

  /**
   * Logs out a single user from the webservice. Removes all related cookies.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public logout = (req: Request, res: Response, next: NextFunction) => {
    req.session.destroy((err) => {
      if (err) {
        next(new AppError('Failed to log out. Please try again later.', 500));
        return;
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
    });
  };

  /**
   * Registers a user into the webservice. Exactly the same as 'createUser' in 'User' entity,
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

    const confirmationCode = randomUUID();
    const user = await services.user.createUser({
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
    await new Email(email, username).sendConfirmation(link);

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 201,
      data: user,
      message:
        'Successfully registered! Please check your email address for verification.',
      type: 'auth',
    });
  };

  /**
   * Resets a user password. Should be the flow after 'forgotPassword' is called and the
   * user clicks on that link.
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
    const user = await services.user.getUser({ forgotPasswordCode: token });
    if (!user) {
      next(new AppError('There is no user associated with the token.', 404));
      return;
    }

    // If user is not active, deny request.
    if (!user.isActive) {
      next(
        new AppError(
          'This user is not active. Please contact the administrator for reactivation.',
          403
        )
      );
      return;
    }

    // If passwords are the same, we update them.
    await services.user.updateUser(
      { userID: user.userID },
      { password: newPassword, forgotPasswordCode: undefined }
    );

    // Destroy all sessions related to this user.
    await CacheService.deleteUserSessions(user.userID);

    // Send email to that user notifying that their password has been reset.
    await new Email(
      user.email,
      user.name + ' ' + user.lastname
    ).sendResetPassword();

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
   * SendOTP sends an OTP to a user with this algorithm:
   * - Get user data from session.
   * - If user has asked for OTP beforehand, do not allow until the related KVS is expired.
   * - Choose from query string: phone, email, or authenticator. Default is authenticator.
   * - Generate TOTP using RFC 6238 algorithm with user-specific properties.
   * - If using authenticators, tell user to verify TOTP as soon as possible.
   * - Send TOTP to that media if applicable.
   * - Set 'hasAskedOTP' in cache to true.
   * - Wait for user to provide TOTP in 'verify' part of the endpoint.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public sendOTP = async (req: Request, res: Response, next: NextFunction) => {
    const { ID } = req.session;

    if (!ID) {
      next(new AppError('No session detected. Please log in again.', 401));
      return;
    }

    // Check the availability of the user.
    const user = await services.user.getUserComplete({ userID: ID });
    if (!user) {
      next(new AppError('User with this ID does not exist!', 404));
      return;
    }

    // If not yet expired, means that the user has asked in 'successive' order and it is a potential to spam.
    if (await CacheService.getHasAskedOTP(ID)) {
      next(
        new AppError(
          'You have recently asked for an OTP. Please wait 30 seconds before we process your request again.',
          429
        )
      );
      return;
    }

    // Guaranteed to be 'email', 'sms', or 'authenticator' due to the validation layer.
    const totp = generateDefaultTOTP(user.username, user.totpSecret);
    if (req.query.media === 'email') {
      await new Email(user.email, user.name + ' ' + user.lastname).sendOTP(
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
    await CacheService.setHasAskedOTP(ID);

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
   * Updates the MFA secret of the currently logged in user.
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
    const { ID } = req.session;

    if (!ID) {
      next(new AppError('No session detected. Please log in again.', 401));
      return;
    }

    // Fetch current user.
    const user = await services.user.getUserComplete({ userID: ID });
    if (!user) {
      next(new AppError('There is no user with that ID.', 404));
      return;
    }

    // Regenerate new MFA secret.
    const newSecret = await nanoid();
    const totp = generateDefaultTOTP(user.username, newSecret);
    await services.user.updateUser({ userID: ID }, { totpSecret: newSecret });

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: {
        uri: totp.uri,
      },
      message: 'Successfully updated MFA secrets.',
      type: 'auth',
    });
  };

  /**
   * Updates a password for the currently logged in user.
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
    const { ID } = req.session;

    if (!ID) {
      next(new AppError('No session detected. Please log in again.', 401));
      return;
    }

    // Fetch old data.
    const user = await services.user.getUserComplete({ userID: ID });
    if (!user) {
      next(new AppError('There is no user with that ID.', 404));
      return;
    }

    // Compare old passwords.
    const passwordsMatch = await verifyPassword(user.password, currentPassword);
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
    await services.user.updateUser({ userID: ID }, { password: newPassword });

    // Send a confirmation email that the user has successfully changed their password.
    await new Email(
      user.email,
      user.name + ' ' + user.lastname
    ).sendUpdatePassword();

    // Destroy all sessons for this current user.
    req.session.destroy(async (err) => {
      if (err) {
        next(
          new AppError('Failed to destroy session. Please contact admin.', 500)
        );
        return;
      }

      // Delete all of the sessions. We use 'user.userID' as 'req.session.ID'
      // is not accessible anymore (already deleted in this callback).
      await CacheService.deleteUserSessions(user.userID);

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
    });
  };

  /**
   * Verifies a user's email.
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
    const user = await services.user.getUserComplete({ email });
    if (!user) {
      next(new AppError('Invalid email verification code!', 400));
      return;
    }

    if (!user.confirmationCode) {
      next(new AppError('Invalid email verification code!', 400));
      return;
    }

    if (code !== user.confirmationCode) {
      next(new AppError('Invalid email verification code!', 400));
      return;
    }

    // Set 'isActive' to true and set code to not defined.
    const updatedUser = await services.user.updateUser(
      { userID: user.userID },
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
   * - Parse 'Basic' authentication. Also check if the user is blocked or not (failed to input correct TOTP many times in successive order).
   * - If the user is blocked, send email / notification to the user.
   * - Get user data from 'username' column of the authentication string.
   * - Pull the user's secret key from the database.
   * - Validate the user's TOTP. The input OTP will be fetched from the 'password' column of the authentication string.
   * - If the TOTP is valid, give back JWS token. This is the user's second session. If not valid, increment the 'TOTPAttempts' in cache.
   * - Take note of the JTI, store it inside Redis cache for statefulness.
   * - Send back response.
   *
   * Token gained from this function will act as a signed cookie that can be used to authenticate oneself.
   * Username is the user's ID. The password is the user's TOTP token.
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
    const user = await services.user.getUserComplete({ username });
    if (!user) {
      this.invalidBasicAuth('User with that ID is not found.', 404, res, next);
      return;
    }

    // If user has reached 3 times, then block the user's attempt.
    // TODO: should send email/sms/push notification to the relevant user
    const attempts = await CacheService.getOTPAttempts(user.userID);
    if (attempts && Number.parseInt(attempts, 10) === 3) {
      // If user is not 'email-locked', send security alert to prevent spam.
      if (!(await CacheService.getSecurityAlertEmailLock(user.userID))) {
        await CacheService.setSecurityAlertEmailLock(user.userID);
        await new Email(user.email, user.name).sendNotification();
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
    const usedOTP = await CacheService.getBlacklistedOTP(user.userID, password);
    if (usedOTP) {
      await CacheService.setOTPAttempts(user.userID);
      this.invalidBasicAuth(
        'This OTP has expired. Please request it again in 30 seconds!',
        410,
        res,
        next
      );
      return;
    }

    // Validate OTP.
    const validTOTP = validateDefaultTOTP(password, user.totpSecret);
    if (!validTOTP) {
      await CacheService.setOTPAttempts(user.userID);
      this.invalidBasicAuth(
        'Invalid authentication, wrong OTP code.',
        401,
        res,
        next
      );
      return;
    }

    // Make sure to blacklist the TOTP (according to the specs).
    await CacheService.blacklistOTP(user.userID, password);

    // Generate JWS as the authorization ticket.
    const jti = await nanoid();
    const token = await signJWS(
      jti,
      user.userID,
      /** expiration 1 month */ 2592000000
    );

    // Set OTP session by its JTI.
    await CacheService.setOTPSession(jti, user.userID);

    // Set cookie for the JWS.
    setCookie({
      req,
      res,
      name: config.JWT_COOKIE_NAME,
      value: token,
      maxAge: 900000, // 15 minutes
    });

    // Send response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: {
        token,
      },
      message: 'OTP verified. Special session has been given to the user.',
      type: 'auth',
    });
  };

  /**
   * Utility function to set `Authenticate` header with the proper `Realm`. Why
   * we do not use `WWW-Authenticate` like in RFC 7617? It is to prevent the
   * front-end from summoning the not-really-friendly authentication popup.
   *
   * @param msg - Error message to be passed to the user.
   * @param code - HTTP status code for the user.
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
   * Sends the user's authentication status to the client in the form of JSON response.
   * The 'type' of the response is authentication, as this one does not really
   * fit with the 'users' type. This intentionally returns both the authentication status
   * AND the user, so the front-end does not need to create two sequential requests just to get
   * the current user (this will be used in many requests in the front-end, so let's just keep our
   * bandwith small).
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param isAuthenticated - Boolean value whether the user is authenticated or not.
   * @param isMFA - Boolean value whether the user is on secure session or not.
   * @param user - The user's data, or a null value.
   */
  private sendUserStatus = (
    req: Request,
    res: Response,
    isAuthenticated: boolean,
    isMFA: boolean,
    user: User | null
  ) => {
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: { isAuthenticated, isMFA, user },
      message: "Successfully fetched the user's status!",
      type: 'auth',
    });
  };
}

export const AuthController = new AuthControllerHandler();
