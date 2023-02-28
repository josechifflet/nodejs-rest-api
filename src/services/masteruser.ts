import { nanoid } from 'nanoid/async';
import { DeepPartial, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { z } from 'zod';

import { generateDefaultTOTP } from '../core/rfc6238';
import { db } from '../db';
import { MasterUser } from '../db/models/masteruser.model';
import { MasterUserToProfile } from '../db/models/masteruser-profile.model';
import { Profile } from '../db/models/profile.model';
import { hashPassword } from '../util/passwords';

/**
 * Almost all user operations return these attributes (usually exposed to the user as response)
 * this is intentional as we do not want sensitive values to be fetched and exposed to the end user.
 */
const select: FindOptionsSelect<MasterUser> = {
  masteruserID: true,
  email: true,
  phoneNumber: true,
  name: true,
  lastname: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};
type MasterUserReduced = Pick<
  MasterUser,
  | 'masteruserID'
  | 'email'
  | 'phoneNumber'
  | 'name'
  | 'lastname'
  | 'role'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
>;
export const masteruserAttributesValidator = z.object({
  masteruserID: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  name: z.string(),
  lastname: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Business logic and repositories for 'MasterUser' entity.
 */
class MasterUserService {
  /**
   * Fetches all users from the database.
   *
   * @returns All users from the database, sensitive columns removed.
   */
  public getMasterUsers = async (): Promise<MasterUserReduced[]> =>
    db.repositories.masteruser.find({ select });

  /**
   * Fetches a single user's complete data with no filters.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single user's complete data (with sensitive values).
   */
  public getMasterUserComplete = async (
    where: FindOptionsWhere<MasterUser>
  ): Promise<MasterUser | null> => db.repositories.masteruser.findOneBy(where);

  /**
   * Fetches a single user's complete data with no filters.
   * Fails otherwise.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single user's complete data (with sensitive values).
   */
  public getMasterUserCompleteOrFail = async (
    where: FindOptionsWhere<MasterUser>
  ): Promise<MasterUser> => db.repositories.masteruser.findOneByOrFail(where);

  /**
   * Fetches a single user with their sensitive data removed.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single user data, filtered (no sensitive values).
   */
  public getMasterUser = async (
    where: FindOptionsWhere<MasterUser>
  ): Promise<MasterUserReduced | null> =>
    db.repositories.masteruser.findOne({ where, select });

  /**
   * Fetches a single user with their sensitive data removed
   * Fails otherwise.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single user data, filtered (no sensitive values).
   */
  public getMasterUserOrFail = async (
    where: FindOptionsWhere<MasterUser>
  ): Promise<MasterUserReduced> =>
    db.repositories.masteruser.findOneOrFail({ where, select });

  /**
   * Fetches a single user based on their username, email, and phone number. This is inspired
   * by Twitter, Facebook, and Google's ways of logging someone in. As username, email, and
   * phone numbers are all unique, it can be assumed that `findFirst` will always return a single
   * and the correct data, due to the earlier constraints.
   *
   * @param username - A user's username.
   * @param email - A user's email.
   * @param phoneNumber - A user's phone number.
   * @returns A single user data with sensitive values.
   */
  public getMasterUserByCredentials = async (
    username: string,
    email: string,
    phoneNumber: string
  ): Promise<MasterUser | null> =>
    db.repositories.masteruser.findOne({
      /** OR operator */
      where: [{ username }, { email }, { phoneNumber }],
    });

  /**
   * Creates a single user data, and generates their own QR code URI for Google Authenticator.
   *
   * @param data - All of a user's required data.
   * @returns A created 'MasterUser' object, with sensitive data removed.
   */
  public createMasterUser = async (
    data: DeepPartial<MasterUser>
  ): Promise<MasterUserReduced & { uri: string }> => {
    const u = { ...data };

    // Create TOTP secrets with a CSPRNG, and hash passwords with Argon2.
    u.totpSecret = await nanoid();
    if (!u.password) throw new Error('Missing password');
    u.password = await hashPassword(u.password);

    // Create a new user.
    const newUser = await db.repositories.masteruser.save(u);

    // Retrieve the created user
    const createdUser = await db.repositories.masteruser.findOneOrFail({
      where: { masteruserPK: newUser.masteruserPK },
      select,
    });

    // Generates a TOTP based on that user, but do not expose them yet. Only fetch the URI.
    const { uri } = generateDefaultTOTP(createdUser.username, u.totpSecret);

    // Return all objects.
    return { ...createdUser, uri };
  };

  /**
   * Updates a single user data.
   *
   * @param where - TypeORM's 'Where' object. Only accepts unique attributes.
   * @param data - A partial object to update the user. Already validated in validation layer.
   * @returns An updated 'MasterUser' object, with sensitive data removed.
   */
  public updateMasterUser = async (
    where: FindOptionsWhere<MasterUser>,
    data: QueryDeepPartialEntity<MasterUser>
  ): Promise<MasterUserReduced> => {
    const u = { ...data };

    // Re-hash password if a user changes their own password.
    if (typeof u.password === 'string' && u.password) {
      u.password = await hashPassword(u.password);
    }

    await db.repositories.masteruser.update(where, u);

    return db.repositories.masteruser.findOneOrFail({ where, select });
  };

  /**
   * Deletes a single user.
   *
   * @param where - TypeORM's 'where' object to decide what to delete.
   * @returns An updated 'MasterUser' object.
   */
  public deleteMasterUser = async (where: FindOptionsWhere<MasterUser>) =>
    db.repositories.masteruser.delete(where);

  /**
   * Returns the MasterUser - Profile entity relation.
   * Fails otherwise.
   *
   * @param masteruserID - masteruser UUID
   * @param profileID - profile UUID
   * @returns The MasterUserToProfile relation entity.
   */
  public hasAccessToProfile = async (
    masteruserID: string,
    profileID: string
  ): Promise<MasterUserToProfile> => {
    const [{ masteruserPK }, { profilePK }] = await Promise.all([
      db.repositories.masteruser.findOneByOrFail({ masteruserID }),
      db.repositories.profile.findOneByOrFail({ profileID }),
    ]);
    return db.repositories.masterUserToProfile.findOneOrFail({
      where: { masteruserPK, profilePK },
    });
  };

  /**
   * Adds a profile to a masteruser, if not added already.
   * Fails otherwise.
   *
   * @param masteruser - masteruser to add the profile to
   * @param profile - profile to add to the masteruser
   * @throws {Error} - If the masteruser or profile does not exist.
   * @throws {Error} - If the masteruser already has access to the profile.
   */
  public addProfileToMasterUser = async (
    masteruser: MasterUser,
    profile: Profile
  ): Promise<void> => {
    // Check if the Profile is already related to the Master User
    try {
      await this.hasAccessToProfile(masteruser.masteruserID, profile.profileID);
    } catch (e) {
      // the profile is not related to the master user, create the relationship
      await db.manager.transaction(async (manager) => {
        // associate the profile with the masteruser
        await manager.save(MasterUserToProfile, {
          masteruserPK: masteruser.masteruserPK,
          profilePK: profile.profilePK,
          order: 1,
        });
      });
    }
  };
}

export default new MasterUserService();
