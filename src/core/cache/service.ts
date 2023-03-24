import { CacheRepository } from './repository';

/**
 * All services in Redis / cache are performed here.
 */
class CacheServiceHandler {
  /**
   * Blacklists an OTP using Redis.
   *
   * @param userID - User ID.
   * @param otp - One time password.
   * @returns Asynchronous number from Redis.
   */
  public blacklistOTP = async (userID: string, otp: string) =>
    CacheRepository.blacklistOTP(userID, otp);

  /**
   * Gets an OTP from the Redis cache in order to know whether it is blacklisted or not.
   *
   * @param userID - UserID of the current user.
   * @param otp - One time password.
   * @returns The OTP, or null.
   */
  public getBlacklistedOTP = async (userID: string, otp: string) =>
    CacheRepository.getBlacklistedOTP(userID, otp);

  /**
   * Gets the total number of times the user tries to reset their password.
   *
   * @param userID - User ID.
   * @returns Number of attempts the user tried to reset their password.
   */
  public getForgotPasswordAttempts = async (userID: string) =>
    CacheRepository.getForgotPasswordAttempts(userID);

  /**
   * Gets whether the user has asked OTP or not.
   *
   * @param userID - A user's ID
   * @returns A value, or null.
   */
  public getHasAskedOTP = async (userID: string) =>
    CacheRepository.getHasAskedOTP(userID);

  /**
   * Gets the number of OTP attempts that is done by a user.
   *
   * @param userID - ID of the user.
   * @returns A value, or null.
   */
  public getOTPAttempts = async (userID: string) =>
    CacheRepository.getOTPAttempts(userID);

  /**
   * Gets the OTP session of a user.
   *
   * @param jti - JSON Web Identifier, to be fetched as 'key'.
   * @returns Value of the OTP Session (usually the user identifier).
   */
  public getOTPSession = async (jti: string) =>
    CacheRepository.getOTPSession(jti);

  /**
   * Gets the lock used to send security alert emails.
   *
   * @param userID - ID of the user.
   * @returns Value to be used.
   */
  public getSecurityAlertEmailLock = async (userID: string) =>
    CacheRepository.getSecurityAlertEmailLock(userID);

  /**
   * Sets or increments the number of attempts of a password reset of a user. Default
   * TTL is set to 7200 seconds to 2 hours before one can ask to reset password again.
   *
   * @param userID - User ID.
   * @returns Asynchronous 'OK'.
   */
  public setForgotPasswordAttempts = async (userID: string) =>
    CacheRepository.setForgotPasswordAttempts(userID);

  /**
   * Sets in the cache whether the user has asked for OTP or not.
   *
   * @param userID - ID of the user.
   * @returns Asychronous 'OK'.
   */
  public setHasAskedOTP = async (userID: string) =>
    CacheRepository.setHasAskedOTP(userID);

  /**
   * Sets the number of OTP 'wrong' attempts of a single user.
   *
   * @param userID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  public setOTPAttempts = async (userID: string) =>
    CacheRepository.setOTPAttempts(userID);

  /**
   * Sets the OTP session. Autheticates a user.
   *
   * @param jti - JSON Web Identifier, to be used as the 'key'.
   * @param value - Value of the 'key-value' pair.
   * @returns Asynchronous 'OK'.
   */
  public setOTPSession = async (jti: string, value: string) =>
    CacheRepository.setOTPSession(jti, value);

  /**
   * Sets the user to be 'email-locked', that is do not send security alert to the user in repeat
   * to prevent SPAM.
   *
   * @param userID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  public setSecurityAlertEmailLock = async (userID: string) =>
    CacheRepository.setSecurityAlertEmailLock(userID);
}

export const CacheService = new CacheServiceHandler();
