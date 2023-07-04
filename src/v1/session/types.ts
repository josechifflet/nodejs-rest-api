import { z } from 'zod';

import SessionValidation from './validation';

export type SessionValidationType = typeof SessionValidation;
export type DeleteUserSessionType = z.infer<
  typeof SessionValidation.deleteUserSession.params
>;
export type DeleteSessionType = z.infer<
  typeof SessionValidation.deleteSession.params
>;
