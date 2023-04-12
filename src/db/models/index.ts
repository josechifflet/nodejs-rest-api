import { Attendance } from './attendance.model';
import { Cache } from './cache.model';
import { Position } from './position.model';
import { Session } from './session.model';
import { Trader } from './trader.model';
import { TraderPerformance } from './trader_performance.model';
import { User } from './user.model';

export const entities = [
  User,
  Attendance,
  Cache,
  Session,
  TraderPerformance,
  Position,
  Trader,
];

export default {
  User,
  Attendance,
  Cache,
  Session,
  TraderPerformance,
  Position,
  Trader,
};
