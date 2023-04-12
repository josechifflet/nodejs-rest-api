import { Attendance } from './models/attendance.model';
import { Cache } from './models/cache.model';
import { Position } from './models/position.model';
import { Session } from './models/session.model';
import { Trader } from './models/trader.model';
import { TraderPerformance } from './models/trader_performance.model';
import { User } from './models/user.model';
import { typeormInstance } from './typeorm-connection';

const repositories = {
  user: typeormInstance.dataSource.manager.getRepository(User),
  attendance: typeormInstance.dataSource.manager.getRepository(Attendance),
  session: typeormInstance.dataSource.manager.getRepository(Session),
  cache: typeormInstance.dataSource.manager.getRepository(Cache),
  trader: typeormInstance.dataSource.manager.getRepository(Trader),
  position: typeormInstance.dataSource.manager.getRepository(Position),
  traderPerformance:
    typeormInstance.dataSource.manager.getRepository(TraderPerformance),
};

export const db = {
  repositories,
  manager: typeormInstance.dataSource.manager,
};
