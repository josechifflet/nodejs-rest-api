import { CacheRepository } from './repository';

/**
 * All services in Redis / cache are performed here.
 */
class CacheServiceHandler {
  /**
   * Blacklists an OTP using Redis.
   *
   * @param masteruserID - User ID.
   * @param otp - One time password.
   * @returns Asynchronous number from Redis.
   */
  public blacklistOTP = async (masteruserID: string, otp: string) =>
    CacheRepository.blacklistOTP(masteruserID, otp);

  /**
   * Gets an OTP from the Redis cache in order to know whether it is blacklisted or not.
   *
   * @param masteruserID - UserID of the current user.
   * @param otp - One time password.
   * @returns The OTP, or null.
   */
  public getBlacklistedOTP = async (masteruserID: string, otp: string) =>
    CacheRepository.getBlacklistedOTP(masteruserID, otp);

  /**
   * Gets the total number of times the user tries to reset their password.
   *
   * @param masteruserID - User ID.
   * @returns Number of attempts the user tried to reset their password.
   */
  public getForgotPasswordAttempts = async (masteruserID: string) =>
    CacheRepository.getForgotPasswordAttempts(masteruserID);

  /**
   * Gets whether the user has asked OTP or not.
   *
   * @param masteruserID - A user's ID
   * @returns A value, or null.
   */
  public getHasAskedOTP = async (masteruserID: string) =>
    CacheRepository.getHasAskedOTP(masteruserID);

  /**
   * Gets the number of OTP attempts that is done by a user.
   *
   * @param masteruserID - ID of the user.
   * @returns A value, or null.
   */
  public getOTPAttempts = async (masteruserID: string) =>
    CacheRepository.getOTPAttempts(masteruserID);

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
   * @param masteruserID - ID of the user.
   * @returns Value to be used.
   */
  public getSecurityAlertEmailLock = async (masteruserID: string) =>
    CacheRepository.getSecurityAlertEmailLock(masteruserID);

  /**
   * Sets or increments the number of attempts of a password reset of a user. Default
   * TTL is set to 7200 seconds to 2 hours before one can ask to reset password again.
   *
   * @param masteruserID - User ID.
   * @returns Asynchronous 'OK'.
   */
  public setForgotPasswordAttempts = async (masteruserID: string) =>
    CacheRepository.setForgotPasswordAttempts(masteruserID);

  /**
   * Sets in the cache whether the user has asked for OTP or not.
   *
   * @param masteruserID - ID of the user.
   * @returns Asychronous 'OK'.
   */
  public setHasAskedOTP = async (masteruserID: string) =>
    CacheRepository.setHasAskedOTP(masteruserID);

  /**
   * Sets the number of OTP 'wrong' attempts of a single user.
   *
   * @param masteruserID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  public setOTPAttempts = async (masteruserID: string) =>
    CacheRepository.setOTPAttempts(masteruserID);

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
   * @param masteruserID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  public setSecurityAlertEmailLock = async (masteruserID: string) =>
    CacheRepository.setSecurityAlertEmailLock(masteruserID);
}

export const CacheService = new CacheServiceHandler();
