import type { NextFunction, Request, Response } from 'express';

import { services } from '../../services';
import AppError from '../../util/app-error';
import getDeviceID from '../../util/device-id';
import getMasterUserSession from '../../util/get-masteruser-session';
import sendResponse from '../../util/send-response';

/**
 * Attendance controller, forwarded requests from 'handler'.
 */
class AttendanceControllerHandler {
  /**
   * Gets all attendances, either (depends on the path parameter):
   * - Attendances of a single user.
   * - All attendances that have been logged into the system.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public getAttendances = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { masteruserID } = getMasterUserSession(req, res);
    const { id } = req.params;

    if (!masteruserID) {
      next(new AppError('No session detected. Please log in again!', 401));
      return;
    }

    // If 'req.params' is not null, it means that we're trying to get the attendance
    // data of a single user instead of getting all attendance data.
    if (id) {
      const user = await services.masteruser.getMasterUserComplete({
        masteruserID: id,
      });
      if (!user) {
        next(new AppError('No user found with that ID.', 404));
        return;
      }

      const attendances = await services.attendance.getAttendances({
        masteruserPK: user.masteruserPK,
      });

      sendResponse({
        req,
        res,
        status: 'success',
        statusCode: 200,
        data: attendances,
        message: 'Successfully fetched all attendances data for a single user.',
        type: 'attendance',
      });
      return;
    }

    const attendances = await services.attendance.getAttendances();
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: attendances,
      message: 'Successfully fetched all attendances data!',
      type: 'attendance',
    });
  };

  /**
   * Gets all attendances of a single user by their session ID.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public getMyAttendances = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { masteruserID } = getMasterUserSession(req, res);

    if (!masteruserID) {
      next(new AppError('No session detected. Please log in again!', 401));
      return;
    }

    const user = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!user) {
      next(new AppError('User with this ID is not found.', 404));
      return;
    }

    const attendances = await services.attendance.getAttendances({
      masteruserPK: user.masteruserPK,
    });
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: attendances,
      message: 'Successfully fetched attendance data for a single user!',
      type: 'attendance',
    });
  };

  /**
   * Gets the attendance status of the current user.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public getStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { masteruserID } = getMasterUserSession(req, res);
    if (!masteruserID) {
      next(new AppError('No session detected. Please log in again!', 401));
      return;
    }

    const today = new Date();
    const [inData, outData] = await Promise.all([
      services.attendance.checked(today, masteruserID, 'in'),
      services.attendance.checked(today, masteruserID, 'out'),
    ]);

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: { hasCheckedIn: !!inData, hasCheckedOut: !!outData },
      message: 'Successfully fetched attendance status for the current user!',
      type: 'attendance',
    });
  };

  /**
   * Checks in a user inside the webservice. Algorithm:
   * - Ensure that the request is made within time (optional).
   * - Fetches the current user to get their identifier.
   * - Create an 'Attendance' object. Try to parse the user's IP and the user's device.
   * - Inserts a new 'Attendance' to the database.
   * - Send back response.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public in = async (req: Request, res: Response, next: NextFunction) => {
    const { remarksEnter } = req.body;
    const { masteruserID } = getMasterUserSession(req, res);

    if (!masteruserID) {
      next(new AppError('No session detected. Please log in again!', 401));
      return;
    }

    // Gets complete user.
    const user = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!user) {
      next(new AppError('User does not exist in the database!', 400));
      return;
    }

    // Checks whether a user has clocked in for today, time is on UTC.
    const today = new Date();
    const checked = await services.attendance.checked(
      today,
      user.masteruserID,
      'in'
    );
    if (checked) {
      next(new AppError('You have already checked in for today!', 400));
      return;
    }

    // Shape request body to follow the 'attendance' data structure.
    const attendance = await services.attendance.createAttendance({
      timeEnter: today,
      ipAddressEnter: getDeviceID(req).ip,
      deviceEnter: getDeviceID(req).device,
      remarksEnter,
      masteruserPK: user.masteruserPK,
    });

    // Send back response.
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 201,
      data: attendance,
      message: 'Successfully checked-in for today in the webservice!',
      type: 'attendance',
    });
  };

  /**
   * Checks out a user inside the webservice. Algorithm:
   * - Ensure that the request is made within time (optional).
   * - Fetches the current user to get their identifier.
   * - Validate a user, does they have already clocked out or not?
   * - Try to check if the user has clocked-in for today. If they have not yet, reject. Get the ID of the attendance.
   * - Create an 'Attendance' object. Try to parse the user's IP and the user's device.
   * - Inserts a new 'Attendance' to the database.
   * - Send back response.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   * @param next - Express.js's next function.
   */
  public out = async (req: Request, res: Response, next: NextFunction) => {
    const { masteruserID } = getMasterUserSession(req, res);
    const { remarksLeave } = req.body;

    if (!masteruserID) {
      next(new AppError('No session detected. Please log in again!', 401));
      return;
    }

    // Gets complete user.
    const user = await services.masteruser.getMasterUserComplete({
      masteruserID,
    });
    if (!user) {
      next(new AppError('User does not exist in the database!', 400));
      return;
    }

    // Checks whether the user has already checked out for today.
    const today = new Date();
    const out = await services.attendance.checked(
      today,
      user.masteruserID,
      'out'
    );
    if (out) {
      next(new AppError('You have checked out for today!', 400));
      return;
    }

    // Checks whether the user has clocked in for today. Time is on UTC.
    const checked = await services.attendance.checked(
      today,
      user.masteruserID,
      'in'
    );
    if (!checked) {
      next(new AppError('You have not yet checked in for today!', 400));
      return;
    }

    // Shape request body to follow the 'attendance' data structure.
    const attendance = await services.attendance.updateAttendance(
      { attendanceID: checked.attendanceID },
      {
        timeLeave: today,
        ipAddressLeave: getDeviceID(req).ip,
        deviceLeave: getDeviceID(req).device,
        remarksLeave,
      }
    );

    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 201,
      data: attendance,
      message: 'Successfully checked-out for today in the webservice!',
      type: 'attendance',
    });
  };
}

export const AttendanceController = new AttendanceControllerHandler();
