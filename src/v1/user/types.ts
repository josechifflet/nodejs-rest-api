import { z } from 'zod';

import UserValidation from './validation';

export type UserValidationType = typeof UserValidation;
export type CreateUserType = z.infer<typeof UserValidation.createUser.body>;
export type DeleteUserType = z.infer<typeof UserValidation.deleteUser.params>;
export type GetUserType = z.infer<typeof UserValidation.getUser.params>;
export type UpdateMeType = z.infer<typeof UserValidation.updateMe.body>;
export type UpdateUserType = z.infer<typeof UserValidation.updateUser.body> &
  z.infer<typeof UserValidation.updateUser.params>;
