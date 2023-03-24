import { Attendance } from './attendance.model';
import { Cache } from './cache.model';
import { Session } from './session.model';
import { User } from './user.model';

export const entities = [User, Attendance, Session, Cache];

export default {
  User,
  Attendance,
  Cache,
  Session,
};
