import { Attendance } from './models/attendance.model';
import { Cache } from './models/cache.model';
import { MasterUser } from './models/masteruser.model';
import { MasterUserToProfile } from './models/masteruser-profile.model';
import { Profile } from './models/profile.model';
import { Session } from './models/session.model';
import { typeormInstance } from './typeorm-connection';

const repositories = {
  masteruser: typeormInstance.dataSource.manager.getRepository(MasterUser),
  attendance: typeormInstance.dataSource.manager.getRepository(Attendance),
  profile: typeormInstance.dataSource.manager.getRepository(Profile),
  session: typeormInstance.dataSource.manager.getRepository(Session),
  masterUserToProfile:
    typeormInstance.dataSource.manager.getRepository(MasterUserToProfile),
  cache: typeormInstance.dataSource.manager.getRepository(Cache),
};

export const db = {
  repositories,
  manager: typeormInstance.dataSource.manager,
};
