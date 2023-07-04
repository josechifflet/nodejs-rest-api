import { z } from 'zod';

/**
 * Special user validations to sanitize and analyze request bodies and parameters.
 */
const UserValidation = {
  // POST /api/v1/users
  createUser: {
    body: z.object({
      username: z.string().trim().min(1).max(25),
      email: z.string().trim().email().min(1).max(50),
      phoneNumber: z
        .string()
        .trim()
        .min(1)
        .max(20)
        .regex(/^[-+0-9]+$/, { message: 'Invalid phoneNumber' }),
      password: z.string().min(8).max(64),
      name: z.string().trim().min(1).max(30),
      lastname: z.string().trim().min(1).max(30),
      role: z
        .string()
        .min(1)
        .max(5)
        .optional()
        .refine((value) => value === 'admin' || value === 'user', {
          message: 'Invalid role',
          path: ['role'],
        })
        .default('user'),
    }),
  },

  // DELETE /api/v1/users/:id
  deleteUser: {
    params: z.object({
      id: z.string().uuid().min(1),
    }),
  },

  // GET /api/v1/users/:id
  getUser: {
    params: z.object({
      id: z.string().uuid().min(1),
    }),
  },

  // PATCH /api/v1/users/me
  updateMe: {
    body: z.object({
      email: z.string().trim().email().min(1).max(50),
      phoneNumber: z
        .string()
        .trim()
        .min(1)
        .max(20)
        .regex(/^[-+0-9]+$/, { message: 'Invalid phoneNumber' }),
      name: z.string().trim().min(1).max(30),
      lastname: z.string().trim().min(1).max(30),
    }),
  },

  // PATCH /api/v1/users/:id
  updateUser: {
    body: z.object({
      username: z.string().trim().min(1).max(25),
      email: z.string().trim().email().min(1).max(50),
      phoneNumber: z
        .string()
        .trim()
        .min(1)
        .max(20)
        .regex(/^[-+0-9]+$/, { message: 'Invalid phoneNumber' }),
      password: z.string().min(8).max(64),
      name: z.string().trim().min(1).max(30),
      lastname: z.string().trim().min(1).max(30),
      role: z
        .string()
        .min(1)
        .max(5)
        .optional()
        .refine((value) => value === 'admin' || value === 'user', {
          message: 'Invalid role',
          path: ['role'],
        }),
      isActive: z.boolean().optional(),
    }),
    params: z.object({
      id: z.string().uuid().min(1),
    }),
  },
};

export default UserValidation;
