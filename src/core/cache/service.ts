import { getCacheValue, setCacheValue } from './helper';
import { CacheRepository } from './repository';

/**
 * All services in Redis / cache are performed here.
 */
class CacheServiceHandler {
  public setArbitraryData = async (key: string, value: string) =>
    setCacheValue(`arbitrary-data:${key}`, value);

  public getArbitraryData = async (key: string, cachedSeconds: number) =>
    getCacheValue(`arbitrary-data:${key}`, cachedSeconds);

  /**
   * Blacklists an OTP using Redis.
   *
   * @param ID - User ID.
   * @param otp - One time password.
   * @returns Asynchronous number from Redis.
   */
  public blacklistOTP = async (ID: string, otp: string) =>
    CacheRepository.blacklistOTP(ID, otp);

  /**
   * Deletes a single session from the cache.
   *
   * @param sessionID - Session ID.
   * @returns Asynchronous number from Redis.
   */
  public deleteSession = async (sessionID: string) =>
    CacheRepository.deleteSession(sessionID);

  /**
   * Deletes all sessions related to a User ID.
   *
   * @param ID - User ID.
   * @returns Asynchronous numbers from Redis.
   */
  public deleteUserSessions = async (ID: string) =>
    CacheRepository.deleteUserSessions(ID);

  /**
   * Gets an OTP from the Redis cache in order to know whether it is blacklisted or not.
   *
   * @param ID - UserID of the current user.
   * @param otp - One time password.
   * @returns The OTP, or null.
   */
  public getBlacklistedOTP = async (ID: string, otp: string) =>
    CacheRepository.getBlacklistedOTP(ID, otp);

  /**
   * Gets the total number of times the user tries to reset their password.
   *
   * @param ID - User ID.
   * @returns Number of attempts the user tried to reset their password.
   */
  public getForgotPasswordAttempts = async (ID: string) =>
    CacheRepository.getForgotPasswordAttempts(ID);

  /**
   * Gets whether the user has asked OTP or not.
   *
   * @param ID - A user's ID
   * @returns A value, or null.
   */
  public getHasAskedOTP = async (ID: string) =>
    CacheRepository.getHasAskedOTP(ID);

  /**
   * Gets the number of OTP attempts that is done by a user.
   *
   * @param ID - ID of the user.
   * @returns A value, or null.
   */
  public getOTPAttempts = async (ID: string) =>
    CacheRepository.getOTPAttempts(ID);

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
   * @param ID - ID of the user.
   * @returns Value to be used.
   */
  public getSecurityAlertEmailLock = async (ID: string) =>
    CacheRepository.getSecurityAlertEmailLock(ID);

  /**
   * Gets all sessions from the cache, also strip cookie information.
   *
   * @returns All sessions in the cache.
   */
  public getSessions = async () => {
    const sessions = await CacheRepository.getSessions();
    return sessions.map((s) => ({ ...s, cookie: undefined, ...s.sessionInfo }));
  };

  /**
   * Gets all sessions specific for a single user, also strip cookie information.
   *
   * @param ID - User ID.
   * @returns All sessions specific for a single user.
   */
  public getUserSessions = async (ID: string) => {
    const sessions = await CacheRepository.getUserSessions(ID);

    return sessions.map((s) => ({ ...s, cookie: undefined, ...s.sessionInfo }));
  };

  /**
   * Sets or increments the number of attempts of a password reset of a user. Default
   * TTL is set to 7200 seconds to 2 hours before one can ask to reset password again.
   *
   * @param ID - User ID.
   * @returns Asynchronous 'OK'.
   */
  public setForgotPasswordAttempts = async (ID: string) =>
    CacheRepository.setForgotPasswordAttempts(ID);

  /**
   * Sets in the cache whether the user has asked for OTP or not.
   *
   * @param ID - ID of the user.
   * @returns Asychronous 'OK'.
   */
  public setHasAskedOTP = async (ID: string) =>
    CacheRepository.setHasAskedOTP(ID);

  /**
   * Sets the number of OTP 'wrong' attempts of a single user.
   *
   * @param ID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  public setOTPAttempts = async (ID: string) =>
    CacheRepository.setOTPAttempts(ID);

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
   * @param ID - ID of the user.
   * @returns Asynchronous 'OK'.
   */
  public setSecurityAlertEmailLock = async (ID: string) =>
    CacheRepository.setSecurityAlertEmailLock(ID);
}

export const CacheService = new CacheServiceHandler();
