import { db } from '../../db';
import { Cache } from '../../db/models/cache.model';
import AppError from '../../util/app-error';
import { isJsonString } from '../../util/string';

/**
 * Cache a value with a function and frecuency.
 * Uses Data column in the Cache table, that is a jsonb column.
 *
 * @param cacheName cache id
 * @param cachedSeconds seconds to cache
 * @param obtainDataFuncion function to obtain data
 * @returns cached value
 */
export const useCacheData =
  (
    cacheName: string,
    cachedSeconds: number,
    obtainDataFuncion: () => Promise<Record<string, unknown>>
  ) =>
  async () => {
    const currentCache = await db.repositories.cache.findOne({
      where: { id: cacheName },
    });
    if (
      currentCache &&
      currentCache.updatedAt.getTime() + cachedSeconds * 1000 > Date.now()
    )
      return currentCache.data;

    if (!currentCache) {
      const newCache = new Cache();
      newCache.id = cacheName;
      newCache.data = await obtainDataFuncion();
      newCache.updatedAt = new Date();
      await db.repositories.cache.save(newCache);
      return newCache.data;
    }

    currentCache.data = await obtainDataFuncion();
    currentCache.updatedAt = new Date();
    await db.repositories.cache.save(currentCache);
    return currentCache.data;
  };

/**
 * Invalidate a cache
 * @param id cache id
 * @returns DeleteResult
 */
export const invalidateCache = async (id: string) =>
  db.repositories.cache.delete(id);

/**
 * Set a value to the cache.
 * Stores the value in the value column, that is a string column.
 *
 * @param id cache id
 * @param value value to cache
 * @returns cached value
 */
export const setCacheValue = async (
  id: string,
  value: string | Record<string, unknown>
) => {
  const actCache = await db.repositories.cache.findOne({ where: { id } });
  if (!actCache) {
    const newCache = new Cache();
    newCache.id = id;
    newCache.value =
      value instanceof Object ? JSON.stringify(value) : value.toString();
    newCache.updatedAt = new Date();
    await db.repositories.cache.save(newCache);

    if (!newCache.value) throw new AppError('Error with the cache', 500);

    return isJsonString(newCache.value)
      ? JSON.parse(newCache.value)
      : newCache.value;
  }

  actCache.value =
    value instanceof Object ? JSON.stringify(value) : value.toString();
  actCache.updatedAt = new Date();
  await db.repositories.cache.save(actCache);

  if (!actCache.value) throw new AppError('Error with the cache', 500);

  return isJsonString(actCache.value)
    ? JSON.parse(actCache.value)
    : actCache.value;
};

/**
 * Get a value from the cache
 * @param id cache id
 * @param cachedSeconds seconds to cache
 * @returns cached value or undefined
 */
export const getCacheValue = async (id: string, cachedSeconds: number) => {
  const currentCache = await db.repositories.cache.findOne({
    where: { id },
  });
  if (
    currentCache &&
    currentCache.updatedAt.getTime() + cachedSeconds * 1000 > Date.now()
  )
    return currentCache.value;

  return null;
};
