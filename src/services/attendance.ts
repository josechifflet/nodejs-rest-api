import {
  Between,
  DeepPartial,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { db } from '../db';
import { Attendance } from '../db/models/attendance.model';

/**
 * All of the return types will return these attributes. This is the default
 * for filtered queries, as we have no need to return sensitive attributes such
 * as secrets and/or passwords.
 */
const select: FindOptionsSelect<Attendance> = {
  attendanceID: true,
  timeEnter: true,
  ipAddressEnter: true,
  deviceEnter: true,
  remarksEnter: true,
  timeLeave: true,
  ipAddressLeave: true,
  deviceLeave: true,
  remarksLeave: true,
  masteruser: { masteruserID: true, name: true, lastname: true },
  profile: { profileID: true },
};

/**
 * Formats a date into 'YYYY/MM/DD' format with the time being 00:00.
 * We do not use 'toISOString()' to prevent timezone clashing.
 *
 * @param date - Date to be formatted.
 * @returns Date in 'YYYY/MM/DD' (00:00) as a Date object.
 */
const formatDate = (date: Date) => new Date(date.toLocaleDateString('en-ZA'));

/**
 * Business logic and repositories for 'Attendance' entity.
 */
class AttendanceService {
  /**
   * Fetches a single attendance based on 'timeLeave' or 'timeEnter' and the associated user identifier.
   * Algorithm:
   * - Find tomorrow's date.
   * - Parse dates to be in 'YYYY-MM-DD' format for both dates (tomorrow and today).
   * - Find first occurence of an attendance based on user id and whose 'timeEnter' (or 'timeLeave')
   * is between today and tomorrow (based on arguments).
   *
   * @param date - Current date as a 'Date' object.
   * @param masteruserID - A user's ID.
   * @param type - A type to check the attendance, based on 'timeEnter' or 'timeLeave'.
   * @returns A single attendance object.
   */
  public checked = async (
    date: Date,
    masteruserID: string,
    type: 'in' | 'out'
  ) => {
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1));

    if (type === 'in') {
      return db.repositories.attendance.findOne({
        where: {
          masteruser: { masteruserID },
          timeEnter: Between(formatDate(date), formatDate(tomorrow)),
        },
      });
    }

    return db.repositories.attendance.findOne({
      where: {
        masteruser: { masteruserID },
        timeLeave: Between(formatDate(date), formatDate(tomorrow)),
      },
    });
  };

  /**
   * Creates a new attendance entry at the system.
   *
   * @param data - Attendance data.
   * @returns The created attendance data.
   */
  public createAttendance = async (data: DeepPartial<Attendance>) => {
    const { attendancePK } = await db.repositories.attendance.save(data);
    return db.repositories.attendance.findOneOrFail({
      where: { attendancePK },
      select,
    });
  };

  /**
   * Gets all attendances data, either global, or all attendances data of a single user.
   *
   * @param where - TypeORM's 'Where' object, accepts unique and/or non unique attributes.
   * @returns All attendance data.
   */
  public getAttendances = async (where?: FindOptionsWhere<Attendance>) => {
    if (typeof where === 'undefined') {
      return db.repositories.attendance.find({
        select,
        order: {
          timeEnter: 'DESC',
          timeLeave: 'DESC',
          attendancePK: 'DESC',
        },
      });
    }

    return db.repositories.attendance.find({
      where,
      select,
      order: {
        timeEnter: 'DESC',
        timeLeave: 'DESC',
        attendancePK: 'DESC',
      },
    });
  };

  /**
   * Updates a single attendance based on ID.
   *
   * @param where - TypeORM's 'Where' object, only accepts unique identifiers.
   * @param data - The new, updated data.
   * @returns Updated attendance data.
   */
  public updateAttendance = async (
    where: FindOptionsWhere<Attendance>,
    data: QueryDeepPartialEntity<Attendance>
  ) => {
    await db.repositories.attendance.update(where, data);
    return db.repositories.attendance.findOneOrFail({ where, select });
  };
}

export default new AttendanceService();
