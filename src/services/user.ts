import { nanoid } from 'nanoid/async';
import { DeepPartial, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { z } from 'zod';

import { generateDefaultTOTP } from '../core/rfc6238';
import { db } from '../db';
import { User } from '../db/models/user.model';
import { hashPassword } from '../util/passwords';

/**
 * Almost all user operations return these attributes (usually exposed to the user as response)
 * this is intentional as we do not want sensitive values to be fetched and exposed to the end user.
 */
const select: FindOptionsSelect<User> = {
  userID: true,
  email: true,
  phoneNumber: true,
  name: true,
  lastname: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};
type UserReduced = Pick<
  User,
  | 'userID'
  | 'email'
  | 'phoneNumber'
  | 'name'
  | 'lastname'
  | 'role'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
>;
export const userAttributesValidator = z.object({
  userID: z.string(),
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
 * Business logic and repositories for 'User' entity.
 */
class UserService {
  /**
   * Fetches all users from the database.
   *
   * @returns All users from the database, sensitive columns removed.
   */
  public getUsers = async (): Promise<UserReduced[]> =>
    db.repositories.user.find({ select });

  /**
   * Fetches a single user's complete data with no filters.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single user's complete data (with sensitive values).
   */
  public getUserComplete = async (
    where: FindOptionsWhere<User>
  ): Promise<User | null> => db.repositories.user.findOneBy(where);

  /**
   * Fetches a single user's complete data with no filters.
   * Fails otherwise.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single user's complete data (with sensitive values).
   */
  public getUserCompleteOrFail = async (
    where: FindOptionsWhere<User>
  ): Promise<User> => db.repositories.user.findOneByOrFail(where);

  /**
   * Fetches a single user with their sensitive data removed.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single user data, filtered (no sensitive values).
   */
  public getUser = async (
    where: FindOptionsWhere<User>
  ): Promise<UserReduced | null> =>
    db.repositories.user.findOne({ where, select });

  /**
   * Fetches a single user with their sensitive data removed
   * Fails otherwise.
   *
   * @param where - TypeORM's 'Where' object that accepts unique attributes only.
   * @returns A single user data, filtered (no sensitive values).
   */
  public getUserOrFail = async (
    where: FindOptionsWhere<User>
  ): Promise<UserReduced> =>
    db.repositories.user.findOneOrFail({ where, select });

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
  public getUserByCredentials = async (
    username: string,
    email: string,
    phoneNumber: string
  ): Promise<User | null> =>
    db.repositories.user.findOne({
      /** OR operator */
      where: [{ username }, { email }, { phoneNumber }],
    });

  /**
   * Creates a single user data, and generates their own QR code URI for Google Authenticator.
   *
   * @param data - All of a user's required data.
   * @returns A created 'User' object, with sensitive data removed.
   */
  public createUser = async (
    data: DeepPartial<User>
  ): Promise<UserReduced & { uri: string }> => {
    const u = { ...data };

    // Create TOTP secrets with a CSPRNG, and hash passwords with Argon2.
    u.totpSecret = await nanoid();
    if (!u.password) throw new Error('Missing password');
    u.password = await hashPassword(u.password);

    // Create a new user.
    const newUser = await db.repositories.user.save(u);

    // Retrieve the created user
    const createdUser = await db.repositories.user.findOneOrFail({
      where: { userPK: newUser.userPK },
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
   * @returns An updated 'User' object, with sensitive data removed.
   */
  public updateUser = async (
    where: FindOptionsWhere<User>,
    data: QueryDeepPartialEntity<User>
  ): Promise<UserReduced> => {
    const u = { ...data };

    // Re-hash password if a user changes their own password.
    if (typeof u.password === 'string' && u.password) {
      u.password = await hashPassword(u.password);
    }

    await db.repositories.user.update(where, u);

    return db.repositories.user.findOneOrFail({ where, select });
  };

  /**
   * Deletes a single user.
   *
   * @param where - TypeORM's 'where' object to decide what to delete.
   * @returns An updated 'User' object.
   */
  public deleteUser = async (where: FindOptionsWhere<User>) =>
    db.repositories.user.delete(where);
}

export default new UserService();
