import { z } from 'zod';

/**
 * Special session validations to sanitize and analyze request bodies and parameters.
 */
const SessionValidation = {
  // DELETE /api/v1/sessions/me/:id
  deleteUserSession: {
    params: z.object({ id: z.string().min(1) }),
  },

  // DELETE /api/v1/sessions/:id
  deleteSession: {
    params: z.object({ id: z.string().min(1) }),
  },
};

export default SessionValidation;
