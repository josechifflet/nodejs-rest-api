import { Arg, Query, Resolver } from 'type-graphql';

import { CacheService } from '../core/cache/service';

@Resolver()
export class CacheResolver {
  @Query(() => String, { nullable: true })
  async getCacheByKey(
    @Arg('key', { nullable: false }) key: string,
    @Arg('time', { nullable: false }) time: number
  ): Promise<string | null> {
    const cachedData = await CacheService.getArbitraryData(key, time);
    return cachedData;
  }
}
