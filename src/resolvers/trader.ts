import { Arg, Query, Resolver } from 'type-graphql';

import { Trader } from '../db/models/trader.model';
import { services } from '../services';

@Resolver()
export class TraderResolver {
  @Query(() => [Trader])
  async users(
    @Arg('limit', { nullable: true }) limit: number,
    @Arg('offset', { nullable: true }) offset: number
  ): Promise<Trader[]> {
    let users = await services.trader.getTraders();
    if (offset && limit) {
      users = users.slice(offset, offset + limit + 1);
    }
    return users;
  }
}
