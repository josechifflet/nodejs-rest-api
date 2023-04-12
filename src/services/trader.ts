import { DeepPartial, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { db } from '../db';
import { Trader } from '../db/models/trader.model';

/**
 * Almost all trader operations return these attributes (usually exposed to the trader as response)
 * this is intentional as we do not want sensitive values to be fetched and exposed to the end trader.
 */
const select: FindOptionsSelect<Trader> = {};

/**
 * Business logic and repositories for 'Traders' entity.
 */
class TraderService {
  /**
   * Fetches all users from the database.
   *
   * @returns All users from the database, sensitive columns removed.
   */
  public getTraders = async () => db.repositories.trader.find({ select });

  /**
   * Fetches a single trader's complete data with no filters.
   *
   * @param where - Prisma's 'Where' object that accepts unique attributes only.
   * @returns A single trader's complete data (with sensitive values).
   */
  public getTraderComplete = async (where: FindOptionsWhere<Trader>) =>
    db.repositories.trader.findOneBy(where);

  /**
   * Fetches a single trader with their sensitive data removed.
   *
   * @param where - Prisma's 'Where' object that accepts unique attributes only.
   * @returns A single trader data, filtered (no sensitive values).
   */
  public getTrader = async (where: FindOptionsWhere<Trader>) =>
    db.repositories.trader.findOne({ where, select });

  /**
   * Fetches a single trader based on their username, email, and phone number. This is inspired
   * by Twitter, Facebook, and Google's ways of logging someone in. As username, email, and
   * phone numbers are all unique, it can be assumed that `findFirst` will always return a single
   * and the correct data, due to the earlier constraints.
   *
   * @param document - A trader's document.
   * @param email - A trader's email.
   * @returns A single trader data, filtered with no sensitive values.
   */
  public getTraderByCredentials = async (
    encryptedUid: string,
    futureUid: string
  ) =>
    db.repositories.trader.findOne({
      /** OR operator */
      where: [{ encryptedUid }, { futureUid }],
    });

  /**
   * Creates a single trader data, and generates their own QR code URI for Google Authenticator.
   *
   * @param data - All of a trader's required data.
   * @returns A created 'Trader' object, with sensitive data removed.
   */
  public createTrader = async (data: DeepPartial<Trader>) => {
    const u = { ...data };

    // Create a new trader.
    const newTrader = await db.repositories.trader.save(u);

    // Retrieve the created trader
    const createdTrader = await db.repositories.trader.findOneByOrFail({
      PK: newTrader.PK,
    });

    // Return all objects.
    return createdTrader;
  };

  /**
   * Updates a single trader data.
   *
   * @param where - Prisma's 'Where' object. Only accepts unique attributes.
   * @param data - A partial object to update the trader. Already validated in validation layer.
   * @returns An updated 'Trader' object, with sensitive data removed.
   */
  public updateTrader = async (
    where: FindOptionsWhere<Trader>,
    data: QueryDeepPartialEntity<Trader>
  ) => {
    const u = { ...data };

    await db.repositories.trader.update(where, u);

    return db.repositories.trader.findOneOrFail({ where, select });
  };

  /**
   * Deletes a single trader.
   *
   * @param where - Prisma's 'where' object to decide what to delete.
   * @returns An updated 'Trader' object.
   */
  public deleteTrader = async (where: FindOptionsWhere<Trader>) =>
    db.repositories.trader.delete(where);
}

export default new TraderService();
