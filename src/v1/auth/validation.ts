import { z } from 'zod';

/**
 * Special auth validations to sanitize and analyze request bodies and parameters.
 */
const AuthValidation = {
  // POST /api/v1/auth/forgot-password
  forgotPassword: {
    body: z.object({
      email: z.string().trim().email().min(1),
      username: z.string().trim().min(1),
    }),
  },

  // POST /api/v1/auth/login
  login: {
    body: z.object({
      username: z.string().trim().min(1),
      password: z.string().min(1),
    }),
  },

  // POST /api/v1/auth/register
  register: {
    body: z.object({
      username: z.string().trim().min(1).max(25),
      email: z.string().trim().email().min(1).max(50),
      phoneNumber: z
        .string()
        .trim()
        .min(1)
        .max(20)
        .regex(/^[-+0-9]+$/, { message: 'Invalid phone number' }),
      password: z.string().min(8).max(64),
      fullName: z.string().trim().min(1).max(30),
    }),
  },

  // PATCH /api/v1/auth/reset-password/:token
  resetPassword: {
    params: z.object({
      token: z.string().min(1),
    }),
    body: z.object({
      newPassword: z.string().min(8).max(64),
      confirmPassword: z.string().min(8).max(64),
    }),
  },

  // POST /api/v1/auth/otp?media=...
  sendOTP: {
    query: z.object({
      media: z
        .string()
        .min(1)
        .refine((value) => ['email', 'sms', 'authenticator'].includes(value), {
          message: 'Invalid media',
          path: ['media'],
        }),
    }),
  },

  // PATCH /api/v1/auth/update-password
  updatePassword: {
    body: z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(64),
      confirmPassword: z.string().min(8).max(64),
    }),
  },

  // PATCH /api/v1/auth/verify-email
  verifyEmail: {
    params: z.object({
      code: z.string().min(1),
      email: z.string().trim().email().min(1).max(50),
    }),
  },
};

export default AuthValidation;
