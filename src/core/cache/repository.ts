import { SessionData } from 'express-session';

import { db } from '../../db';
import { Session } from '../../db/models/session.model';
import { getCacheValue, setCacheValue } from './helper';

/**
 * All cache operations in its low leveled form.
 */
class CacheRepositoryHandler {
  /**
   * Sets an OTP to be blacklisted in the Redis cache for 120 seconds.
   *
   * @param masteruserID - User ID that has used that OTP.
   * @param otp - One-time password.
   * @returns Asynchronous number, response returned from Redis.
   */
  blacklistOTP = async (masteruserID: string, otp: string) =>
    setCacheValue(`blacklisted-otp:${masteruserID}:${otp}`, '1');

  /**
   * Gets an OTP from the Redis cache in order to check if it is blacklisted or not.
   *
   * @param masteruserID - User ID of the current user.
   * @param otp - One-time password.
   * @returns Asynchronous number, response returned from Redis.
   */
  getBlacklistedOTP = async (masteruserID: string, otp: string) =>
    getCacheValue(`blacklisted-otp:${masteruserID}:${otp}`, 120);

  /**
   * Gets the total number of times the user tries to reset their password.
   *
   * @param masteruserID - User ID.
   * @returns Number of attempts the user tried to reset their password.
   */
  getForgotPasswordAttempts = async (masteruserID: string) =>
    getCacheValue(`forgot-password-attempts:${masteruserID}`, 7200);

  /**
   * Gets whether the user has asked OTP or not.
   *
   * @param masteruserID - A user's ID
   * @returns A promise consisting of the value, or null.
   */
  getHasAskedOTP = async (masteruserID: string) =>
    getCacheValue(`asked-otp:${masteruserID}`, 30);

  /**
   * Gets the number of OTP attempts that is done by a user.
   *
   * @param masteruserID - ID of the user.
   * @returns A promise consisting of the value, or null.
   */
  getOTPAttempts = async (masteruserID: string) =>
    getCacheValue(`otp-attempts:${masteruserID}`, 86400);

  /**
   * Gets the OTP session related to a JTI.
   *
   * @param jti - JSON Web Identifier as 'key'.
   * @returns Value to be used elsewhere, usually 'user identifier'.
   */
  getOTPSession = async (jti: string) => getCacheValue(`otp-sess:${jti}`, 900);

  /**
   * Gets the lock used to send security alert emails.
   *
   * @param masteruserID - ID of the user.
   * @returns Value to be used.
   */
  getSecurityAlertEmailLock = async (masteruserID: string) =>
    getCacheValue(`security-alert-email-lock:${masteruserID}`, 900);

  /**
   * Sets or increments the number of attempts of a password reset of a user. Default
   * TTL is set to 7200 seconds to 2 hours before one can ask to reset password again.
   *
   * @param masteruserID - User ID.
   * @returns Asynchronous 'OK'.
   */
  setForgotPasswordAttempts = async (masteruserID: string) => {
    const currentAttempts = await getCacheValue(
      `forgot-password-attempts:${masteruserID}`,
      7200
    );
    if (currentAttempts === null) {
      return setCacheValue(`forgot-password-attempts:${masteruserID}`, '1');
    }

    const attempts = +currentAttempts + 1;
    return setCacheValue(
      `forgot-password-attempts:${masteruserID}`,
      attempts.toString()
    );
  };

  /**
   * Sets in the cache whether the user has asked for OTP or not.
   * TTL is 30 seconds. This will be used to prevent a user's spamming for OTP requests.
   *
   * @param masteruserID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  setHasAskedOTP = async (masteruserID: string) =>
    setCacheValue(`asked-otp:${masteruserID}`, '1');

  /**
   * Sets the number of OTP 'wrong' attempts of a single user.
   * TTL is 86400 seconds or a single day. Will use Redis's 'INCR' method to ensure atomic operations.
   *
   * @param masteruserID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  setOTPAttempts = async (masteruserID: string) => {
    const currentAttempts = await getCacheValue(
      `otp-attempts:${masteruserID}`,
      86400
    );
    if (currentAttempts === null) {
      return setCacheValue(`otp-attempts:${masteruserID}`, '1');
    }

    const attempts = +currentAttempts + 1;
    return setCacheValue(`otp-attempts:${masteruserID}`, attempts.toString());
  };

  /**
   * Sets the OTP session of a user. TTL is 900 seconds or 15 minutes.
   *
   * @param jti - JSON Web Identifier as 'key'.
   * @param value - Value to be stored, usually 'user identifier'.
   * @returns Asynchronous 'OK'.
   */
  setOTPSession = async (jti: string, value: string) =>
    setCacheValue(`otp-sess:${jti}`, value);

  /**
   * Sets the user to be 'email-locked', that is do not send security alert to the user in repeat
   * to prevent SPAM.
   *
   * @param masteruserID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  setSecurityAlertEmailLock = async (masteruserID: string) =>
    setCacheValue(`security-alert-email-lock:${masteruserID}`, '1');

  /**
   * Deletes a single session from the cache.
   *
   * @param sessionID - Session identifier.
   * @returns Asynchronous number, response returned from Redis.
   */
  deleteSession = async (sessionID: string) =>
    db.repositories.session.delete({ id: sessionID });

  /**
   * Deletes all sessions related to this user.
   *
   * @param ID - User ID.
   * @returns Asynchronous numbers, which are the responses returned from Redis.
   */
  deleteUserSessions = async (ID: string) => {
    const sessions = (await this.allSessions()).filter((s) => s.ID === ID);

    return Promise.all(sessions.map(async (s) => this.deleteSession(s.id)));
  };

  /**
   * Returns all sessions that is in this webservice.
   *
   * @returns All sessions in the webservice.
   */
  getSessions = async () => this.allSessions();

  /**
   * Fetches all sessions that are specific to a single user.
   *
   * @param ID - User ID.
   * @returns All sessions specific to a single user.
   */
  getUserSessions = async (ID: string) =>
    (await this.allSessions()).filter((sess) => sess.ID === ID);

  /**
   * Fetches all related data that matches to an expression in Session Table. Usually
   * used in order to fetch all key-value pairs with the right pattern.
   *
   * @returns All results of the 'SCAN' operation.
   */
  private scanAll = async () => db.repositories.session.find();

  /**
   * Fetches all sessions that are available in the Redis cache.
   *
   * @returns All sessions in the Redis database.
   */
  private allSessions = async () => {
    // Seek and fetch all active sessions.
    const activeSessionsCached: Session[] = await this.scanAll();

    // Fetch all session data from available session IDs. The 'JSON.parse'
    // is required as Redis stores all data in its stringified form. Also
    // pass the session ID for easier deletion on the front-end. Perform parallel
    // processing with 'await Promise.all' to save time.
    const sessions = await Promise.all(
      activeSessionsCached.map(async (sess) => {
        const data = sess.data;
        const sid = sess.id;

        return { ...(JSON.parse(data) as SessionData), sid };
      })
    );

    return sessions;
  };
}

export const CacheRepository = new CacheRepositoryHandler();
