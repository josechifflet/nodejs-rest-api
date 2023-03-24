import { getCacheValue, setCacheValue } from './helper';

/**
 * All cache operations in its low leveled form.
 */
class CacheRepositoryHandler {
  /**
   * Sets an OTP to be blacklisted in the Redis cache for 120 seconds.
   *
   * @param userID - User ID that has used that OTP.
   * @param otp - One-time password.
   * @returns Asynchronous number, response returned from Redis.
   */
  blacklistOTP = async (userID: string, otp: string) =>
    setCacheValue(`blacklisted-otp:${userID}:${otp}`, '1');

  /**
   * Gets an OTP from the Redis cache in order to check if it is blacklisted or not.
   *
   * @param userID - User ID of the current user.
   * @param otp - One-time password.
   * @returns Asynchronous number, response returned from Redis.
   */
  getBlacklistedOTP = async (userID: string, otp: string) =>
    getCacheValue(`blacklisted-otp:${userID}:${otp}`, 120);

  /**
   * Gets the total number of times the user tries to reset their password.
   *
   * @param userID - User ID.
   * @returns Number of attempts the user tried to reset their password.
   */
  getForgotPasswordAttempts = async (userID: string) =>
    getCacheValue(`forgot-password-attempts:${userID}`, 7200);

  /**
   * Gets whether the user has asked OTP or not.
   *
   * @param userID - A user's ID
   * @returns A promise consisting of the value, or null.
   */
  getHasAskedOTP = async (userID: string) =>
    getCacheValue(`asked-otp:${userID}`, 30);

  /**
   * Gets the number of OTP attempts that is done by a user.
   *
   * @param userID - ID of the user.
   * @returns A promise consisting of the value, or null.
   */
  getOTPAttempts = async (userID: string) =>
    getCacheValue(`otp-attempts:${userID}`, 86400);

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
   * @param userID - ID of the user.
   * @returns Value to be used.
   */
  getSecurityAlertEmailLock = async (userID: string) =>
    getCacheValue(`security-alert-email-lock:${userID}`, 900);

  /**
   * Sets or increments the number of attempts of a password reset of a user. Default
   * TTL is set to 7200 seconds to 2 hours before one can ask to reset password again.
   *
   * @param userID - User ID.
   * @returns Asynchronous 'OK'.
   */
  setForgotPasswordAttempts = async (userID: string) => {
    const currentAttempts = await getCacheValue(
      `forgot-password-attempts:${userID}`,
      7200
    );
    if (currentAttempts === null) {
      return setCacheValue(`forgot-password-attempts:${userID}`, '1');
    }

    const attempts = +currentAttempts + 1;
    return setCacheValue(
      `forgot-password-attempts:${userID}`,
      attempts.toString()
    );
  };

  /**
   * Sets in the cache whether the user has asked for OTP or not.
   * TTL is 30 seconds. This will be used to prevent a user's spamming for OTP requests.
   *
   * @param userID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  setHasAskedOTP = async (userID: string) =>
    setCacheValue(`asked-otp:${userID}`, '1');

  /**
   * Sets the number of OTP 'wrong' attempts of a single user.
   * TTL is 86400 seconds or a single day. Will use Redis's 'INCR' method to ensure atomic operations.
   *
   * @param userID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  setOTPAttempts = async (userID: string) => {
    const currentAttempts = await getCacheValue(
      `otp-attempts:${userID}`,
      86400
    );
    if (currentAttempts === null) {
      return setCacheValue(`otp-attempts:${userID}`, '1');
    }

    const attempts = +currentAttempts + 1;
    return setCacheValue(`otp-attempts:${userID}`, attempts.toString());
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
   * @param userID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  setSecurityAlertEmailLock = async (userID: string) =>
    setCacheValue(`security-alert-email-lock:${userID}`, '1');
}

export const CacheRepository = new CacheRepositoryHandler();
