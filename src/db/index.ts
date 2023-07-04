import { Attendance } from './models/attendance.model';
import { Cache } from './models/cache.model';
import { Session } from './models/session.model';
import { User } from './models/user.model';
import { typeormInstance } from './typeorm-connection';

const repositories = {
  user: typeormInstance.dataSource.manager.getRepository(User),
  attendance: typeormInstance.dataSource.manager.getRepository(Attendance),
  session: typeormInstance.dataSource.manager.getRepository(Session),
  cache: typeormInstance.dataSource.manager.getRepository(Cache),
};

export const db = {
  repositories,
  manager: typeormInstance.dataSource.manager,
};
