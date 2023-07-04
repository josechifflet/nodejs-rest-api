import { z } from 'zod';

import AttendanceValidation from './validation';

export type AttendanceValidationType = typeof AttendanceValidation;
export type GetAttendancesType = z.infer<
  typeof AttendanceValidation.getAttendances.params
>;
export type InType = z.infer<typeof AttendanceValidation.in.body>;
export type OutType = z.infer<typeof AttendanceValidation.out.body>;
