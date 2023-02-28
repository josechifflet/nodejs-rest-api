import { Attendance } from './attendance.model';
import { Cache } from './cache.model';
import { MasterUser } from './masteruser.model';
import { MasterUserToProfile } from './masteruser-profile.model';
import { Profile } from './profile.model';
import { Session } from './session.model';

export const entities = [
  MasterUser,
  Attendance,
  Profile,
  MasterUserToProfile,
  Session,
  Cache,
];

export default {
  MasterUser,
  Attendance,
  Profile,
  MasterUserToProfile,
  Cache,
  Session,
};
