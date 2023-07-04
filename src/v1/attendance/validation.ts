import { z } from 'zod';

/**
 * Special attendance validations to sanitize and analyze request bodies and parameters.
 */
const AttendanceValidation = {
  // GET /api/v1/attendances and/or /api/v1/users/{id}/attendances
  getAttendances: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },

  // POST /api/v1/attendances/in
  in: {
    body: z.object({
      remarksEnter: z.string().trim().max(100),
    }),
  },

  // PATCH /api/v1/attendances/out
  out: {
    body: z.object({
      remarksLeave: z.string().trim().max(100),
    }),
  },
};

export default AttendanceValidation;
