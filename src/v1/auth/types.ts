import { z } from 'zod';

import AuthValidation from './validation';

export type AuthValidationType = typeof AuthValidation;
export type ForgotPasswordType = z.infer<
  typeof AuthValidation.forgotPassword.body
>;
export type LoginType = z.infer<typeof AuthValidation.login.body>;
export type RegisterType = z.infer<typeof AuthValidation.register.body>;
export type ResetPasswordType = z.infer<
  typeof AuthValidation.resetPassword.body
>;
export type SendOTPType = z.infer<typeof AuthValidation.sendOTP.query>;
export type UpdatePasswordType = z.infer<
  typeof AuthValidation.updatePassword.body
>;
export type VerifyEmailType = z.infer<typeof AuthValidation.verifyEmail.params>;
