import { DeepPartial, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { z } from 'zod';

import { db } from '../db';
import { MasterUserToProfile } from '../db/models/masteruser-profile.model';
import { Profile } from '../db/models/profile.model';
import { hashPassword } from '../util/passwords';
import { services } from '.';

/**
 * Almost all profile operations return these attributes (usually exposed to the profile as response)
 * this is intentional as we do not want sensitive values to be fetched and exposed to the end profile.
 */
const select: FindOptionsSelect<Profile> = {
  profileID: true,
  username: true,
  email: true,
  name: true,
  lastname: true,
  profileImg: true,
  isActive: true,
};
type ProfileReduced = Pick<
  Profile,
  'profileID' | 'username' | 'isActive' | 'email' | 'name' | 'lastname' | 'profileImg'
>;

export const profileAttributesValidator = z.object({
  profileID: z.string(),
  username: z.string(),
  email: z.string(),
  name: z.string(),
  lastname: z.string(),
  profileImg: z.string().optional().nullable(),
  isActive: z.boolean(),
});

/**
 * Business logic and repositories for 'Profiles' entity.
 */
class ProfileService {
  /**
   * Fetches all profiles from the database.
   *
   * @returns All profiles from the database, sensitive columns removed.
   */
  public getProfiles = async (
    where?: FindOptionsWhere<Profile>
  ): Promise<ProfileReduced[]> =>
    db.repositories.profile.find({ select, where });

  /**
   * Fetches a single profile's complete data with no filters.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single profile's complete data (with sensitive values).
   */
  public getProfileComplete = async (
    where: FindOptionsWhere<Profile>
  ): Promise<Profile | null> => db.repositories.profile.findOneBy(where);

  /**
   * Fetches a single profile with their sensitive data removed.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single profile data, filtered (no sensitive values).
   */
  public getProfile = async (
    where: FindOptionsWhere<Profile>
  ): Promise<ProfileReduced | null> =>
    db.repositories.profile.findOne({ where, select });

  /**
   * Creates a single profile data, and generates their own QR code URI for Google Authenticator.
   *
   * @param data - All of a profile's required data.
   * @returns A created 'Profile' object, with sensitive data removed.
   */
  public createProfile = async (
    masteruserID: string,
    data: DeepPartial<Profile>
  ): Promise<ProfileReduced | null> => {
    const u = { ...data };

    // Hash password with Argon2.
    if (!u.password) throw new Error('Missing password');
    u.password = await hashPassword(u.password);

    // masteruser to associate the profile
    const masteruser = await services.masteruser.getMasterUserCompleteOrFail({
      masteruserID,
    });

    // Create a new profile transactionally
    const newProfile = await db.manager.transaction(async (manager) => {
      u.isActive = true;
      const profileSaved = await manager.save(Profile, u);

      // associate the profile with the masteruser
      await manager.save(MasterUserToProfile, {
        masteruserPK: masteruser.masteruserPK,
        profilePK: profileSaved.profilePK,
        order: 1,
      });

      return profileSaved;
    });

    // Retrieve the created profile
    const createdProfile = await db.repositories.profile.findOneOrFail({
      where: { profilePK: newProfile.profilePK },
      select,
    });

    // Return all objects.
    return createdProfile;
  };

  /**
   * Updates a single profile data.
   *
   * @param where - TypeORM's 'Where' object. Only accepts unique attributes.
   * @param data - A partial object to update the profile. Already validated in validation layer.
   * @returns An updated 'Profile' object, with sensitive data removed.
   */
  public updateProfile = async (
    where: FindOptionsWhere<Profile>,
    data: QueryDeepPartialEntity<Profile>
  ): Promise<ProfileReduced | null> => {
    const u = { ...data };

    // Re-hash password if a profile changes their own password.
    if (typeof u.password === 'string' && u.password) {
      u.password = await hashPassword(u.password);
    }

    await db.repositories.profile.update(where, u);

    return db.repositories.profile.findOneOrFail({ where, select });
  };

  /**
   * Deletes a single profile.
   *
   * @param where - TypeORM's 'where' object to decide what to delete.
   * @returns An updated 'Profile' object.
   */
  public deleteProfile = async (profile: Partial<Profile>) => {
    await db.repositories.masterUserToProfile.delete({ profilePK: profile.profilePK });
    await db.repositories.profile.delete({ profileID: profile.profileID });
  }
}

export default new ProfileService();
